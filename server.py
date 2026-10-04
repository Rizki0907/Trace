import os
import io
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import math
import base64

# ==========================================
# Neural Network Architecture Definitions
# ==========================================
class GradientReversalFunction(torch.autograd.Function):
    @staticmethod
    def forward(ctx, x, lambd):
        ctx.lambd = lambd
        return x.view_as(x)

    @staticmethod
    def backward(ctx, grad_output):
        return grad_output * -ctx.lambd, None

class GradientReversalLayer(nn.Module):
    def __init__(self):
        super().__init__()
        self.lambd = 1.0

    def set_lambda(self, lambd):
        self.lambd = lambd

    def forward(self, x):
        return GradientReversalFunction.apply(x, self.lambd)

class ProposedTransformNet(nn.Module):
    def __init__(self, in_dim=512, hidden_dim=512, out_dim=512):
        super().__init__()
        self.fc1 = nn.Linear(in_dim, hidden_dim)
        self.bn1 = nn.BatchNorm1d(hidden_dim)
        self.act = nn.LeakyReLU(0.1)
        self.drop = nn.Dropout(0.2)
        self.fc2 = nn.Linear(hidden_dim, out_dim)
        self.bn2 = nn.BatchNorm1d(out_dim)
        self.alpha = nn.Parameter(torch.tensor(0.30))

    def forward(self, x):
        h = self.drop(self.act(self.bn1(self.fc1(x))))
        res = self.bn2(self.fc2(h))
        t = x + torch.clamp(self.alpha, 0.10, 0.50) * res
        return F.normalize(t, p=2, dim=1)

class TemplateDecoder(nn.Module):
    def __init__(self, template_dim, embedding_dim):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(template_dim, 1024),
            nn.BatchNorm1d(1024),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.2),
            nn.Linear(1024, 1024),
            nn.BatchNorm1d(1024),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.2),
            nn.Linear(1024, 512),
            nn.BatchNorm1d(512),
            nn.LeakyReLU(0.2),
            nn.Linear(512, embedding_dim),
        )

    def forward(self, x):
        out = self.net(x)
        return F.normalize(out, p=2, dim=1)

# ==========================================
# Initialize FastAPI & Load Models
# ==========================================
app = FastAPI(title="TRACE Biometric API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {DEVICE}")

# Initialize Models
proposed_net = ProposedTransformNet(in_dim=512, hidden_dim=256, out_dim=512).to(DEVICE)
try:
    proposed_net.load_state_dict(torch.load("assets/proposed_net_final.pth", map_location=DEVICE))
    proposed_net.eval()
    print("Loaded TRACE ProposedNet successfully.")
except Exception as e:
    print(f"Failed to load ProposedNet: {e}")

decoder_net = TemplateDecoder(template_dim=256, embedding_dim=512).to(DEVICE)
try:
    decoder_net.load_state_dict(torch.load("assets/deep_attacker_final.pth", map_location=DEVICE))
    decoder_net.eval()
    print("Loaded TRACE Deep Attacker successfully.")
except Exception as e:
    print(f"Failed to load Deep Attacker: {e}")

# Helper: Orthogonal Key Matrix
def generate_key_matrix(seed, in_dim, out_dim):
    generator = np.random.default_rng(seed)
    matrix = generator.normal(size=(in_dim, out_dim))
    q, _ = np.linalg.qr(matrix)
    return torch.tensor(q, dtype=torch.float32).to(DEVICE)

# ==========================================
# API Endpoints
# ==========================================

@app.post("/api/enroll")
async def enroll(seed: int = Form(20260728), dim: int = Form(256)):
    # In a real scenario, this endpoint receives an image upload, extracts 512d embedding via AdaFace,
    # and processes it. For the simulation, we'll generate a dummy 512d face embedding from a real normal distribution
    # to simulate the AdaFace extraction of a SurvFace image.
    generator = np.random.default_rng(seed + 123)
    dummy_face_embedding = generator.normal(0, 1, size=(1, 512))
    dummy_face_embedding = dummy_face_embedding / np.linalg.norm(dummy_face_embedding, axis=1, keepdims=True)
    input_tensor = torch.tensor(dummy_face_embedding, dtype=torch.float32).to(DEVICE)
    
    with torch.no_grad():
        # 1. TRACE Adversarial Transformation
        protected_latent = proposed_net(input_tensor)
        
        # 2. Orthogonal Matrix Generation
        key_matrix = generate_key_matrix(seed, 512, dim)
        
        # 3. Random Projection & LSH Quantization
        projected = torch.matmul(protected_latent, key_matrix)
        binary_template = (projected > 0).float()
    
    # Format output for frontend
    bin_str = ''.join(['1' if x == 1.0 else '0' for x in binary_template[0].cpu().numpy()])
    hex_str = f"{int(bin_str, 2):0{dim//4}X}"
    
    return JSONResponse({
        "status": "success",
        "binary": bin_str,
        "hex": hex_str,
        "raw_template": binary_template[0].cpu().tolist()
    })

@app.post("/api/hack")
async def hack(template: str = Form(...)):
    # Convert binary string back to tensor
    bin_list = [float(x) for x in template]
    bin_tensor = torch.tensor([bin_list], dtype=torch.float32).to(DEVICE)
    
    # 4. Attack using Decoder
    with torch.no_grad():
        reconstructed_latent = decoder_net(bin_tensor)
        
    # We return the reconstructed 512d latent, which normally is a face embedding.
    # To show the blur blob, we can simulate an inverse-GAN process, or just return a static blob image
    # for dramatic effect, since in the paper the reconstruction visualization is purely for qualitative analysis.
    # We will return the first 50 values to show how 'damaged' it is.
    reconstructed_sample = reconstructed_latent[0].cpu().tolist()[:50]
    
    return JSONResponse({
        "status": "success",
        "reconstructed_vector_sample": reconstructed_sample,
        "message": "Template biner telah berhasil di-rekonstruksi oleh Attacker Network."
    })

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
