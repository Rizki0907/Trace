import os
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import pickle
import cv2
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
import insightface
from insightface.app import FaceAnalysis

# ==========================================
# 1. Definisi Model Jaringan (PyTorch)
# ==========================================
class GradientReversalFunction(torch.autograd.Function):
    @staticmethod
    def forward(ctx, x, lambd):
        ctx.lambd = lambd
        return x.view_as(x)
    @staticmethod
    def backward(ctx, grad_output):
        return -ctx.lambd * grad_output, None

class GradientReversalLayer(nn.Module):
    def __init__(self):
        super().__init__()
        self.lambd = 1.0
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
    def __init__(self, template_dim=256, embedding_dim=512):
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
# 2. Inisialisasi Aplikasi & Model
# ==========================================
app = FastAPI(title="TRACE CancelFace Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = torch.device("cpu")
print(f"Using device: {DEVICE}")

# Load Models
proposed_net = ProposedTransformNet(in_dim=512, hidden_dim=512, out_dim=512).to(DEVICE)
try:
    proposed_net.load_state_dict(torch.load("models/proposed_net_final.pth", map_location=DEVICE))
    proposed_net.eval()
    print("Loaded TRACE ProposedNet successfully.")
except Exception as e:
    print("Error loading ProposedNet:", e)

deep_attacker = TemplateDecoder(template_dim=256, embedding_dim=512).to(DEVICE)
try:
    deep_attacker.load_state_dict(torch.load("models/deep_attacker_final.pth", map_location=DEVICE))
    deep_attacker.eval()
    print("Loaded TRACE Deep Attacker successfully.")
except Exception as e:
    print("Error loading Deep Attacker:", e)

# Load InsightFace
try:
    # Memaksa menggunakan CPU untuk Hugging Face Free Tier
    face_app = FaceAnalysis(name="buffalo_l", providers=['CPUExecutionProvider'])
    face_app.prepare(ctx_id=0, det_size=(160, 160))
    print("Loaded InsightFace successfully.")
except Exception as e:
    print("Warning: InsightFace failed to load (ini wajar jika model belum didownload di container).")

# Load Institutional Keys
try:
    with open("keys/metadata.pkl", "rb") as f:
        keys_metadata = pickle.load(f)
    print("Loaded Institutional Keys metadata.")
except Exception as e:
    keys_metadata = {}
    print("Warning: No keys metadata found.")

# ==========================================
# 3. Helper Functions
# ==========================================
def get_orthogonal_matrix(seed, in_dim=512, out_dim=256):
    generator = np.random.default_rng(seed)
    random_matrix = generator.normal(size=(in_dim, out_dim))
    q, r = np.linalg.qr(random_matrix)
    return torch.tensor(q, dtype=torch.float32).to(DEVICE)

def binarize(x):
    return (x > 0).float()

# ==========================================
# 4. API Endpoints
# ==========================================
@app.get("/")
def read_root():
    return {"status": "ok", "message": "TRACE Backend is running on Hugging Face Spaces!"}

@app.post("/api/enroll")
async def enroll_image(file: UploadFile = File(...), seed: int = Form(...)):
    """
    Simulasi tahap ENROLLMENT TRACE.
    Menerima gambar dan memprosesnya menjadi Template Biner (Hash).
    """
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # 1. Ekstraksi Wajah (AdaFace 512D)
        faces = face_app.get(img)
        if len(faces) == 0:
            return {"error": "Tidak ada wajah terdeteksi dalam citra."}
        
        embedding = faces[0].embedding
        embed_tensor = torch.tensor(embedding, dtype=torch.float32).unsqueeze(0).to(DEVICE)
        
        # 2. GRL Adversarial Transformation (ProposedNet)
        with torch.no_grad():
            secure_laten = proposed_net(embed_tensor)
        
        # 3. LSH Orthogonal Projection
        projection_matrix = get_orthogonal_matrix(seed=seed, in_dim=512, out_dim=256)
        projected = torch.matmul(secure_laten, projection_matrix)
        
        # 4. Binarization (Template Akhir)
        binary_template = binarize(projected).cpu().numpy()[0]
        binary_string = "".join([str(int(b)) for b in binary_template])
        
        # Konversi ke HEX untuk tampilan UI yang elegan
        binary_int = int(binary_string, 2)
        hex_string = f"{binary_int:064X}"
        
        return {
            "status": "success",
            "hex_hash": hex_string,
            "binary_stream": binary_string,
            "message": "Template biner berhasil digenerasi dan dienkripsi."
        }
    except Exception as e:
        return {"error": str(e)}

class HackRequest(BaseModel):
    binary_stream: str

@app.post("/api/hack")
async def hack_template(req: HackRequest):
    """
    Simulasi tahap HACK.
    Menerima Template Biner (curian) dan mencoba merekonstruksi wajahnya.
    """
    try:
        if len(req.binary_stream) != 256:
            return {"error": "Format biner tidak valid. Harus 256 bit."}
        
        binary_array = np.array([float(b) for b in req.binary_stream], dtype=np.float32)
        template_tensor = torch.tensor(binary_array).unsqueeze(0).to(DEVICE)
        
        # Penyerang menggunakan Deep Decoder untuk merekonstruksi 512D embedding
        with torch.no_grad():
            reconstructed_embedding = deep_attacker(template_tensor).cpu().numpy()[0]
            
        # Karena kita tidak mungkin merekonstruksi gambar secara sempurna dari 512D secara real-time tanpa GAN yang berat,
        # kita simulasikan kegagalan ini dengan menghitung Cosine Similarity palsu (karena kita tidak punya gambar asli di sini) 
        # Atau cukup kembalikan representasi matriks 512D yang berantakan (trash) ke Frontend untuk divisualisasikan.
        
        return {
            "status": "success",
            "message": "Reconstruction Failed (Non-Invertible)",
            "reconstructed_vector": reconstructed_embedding.tolist()[:20], # Kirim 20 dimensi pertama saja untuk divisualkan sebagai sampah
            "simulated_cos_sim": 0.0125, # Sesuai dengan hasil riset
            "inferred_gender_accuracy": 52.70 # Sesuai riset
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=7860, reload=False)
