from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="TRACE CancelFace Backend API")

# Izinkan frontend (Vercel) untuk memanggil API ini
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Nanti bisa dikunci ke URL Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "TRACE Backend is running!"}

@app.post("/api/simulate/process")
async def process_image(file: UploadFile = File(...)):
    # TODO: Logika menerima gambar -> InsightFace -> Warping -> TRACE Template
    return {"message": "Endpoint process belum siap, menunggu model pth!"}

@app.post("/api/simulate/hack")
async def hack_template(template: list):
    # TODO: Logika menerima template curian -> Deep Attacker -> Rekonstruksi Wajah Sampah
    return {"message": "Endpoint hack belum siap, menunggu model pth!"}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=7860, reload=True)
