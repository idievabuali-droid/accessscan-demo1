import sys
from pathlib import Path
from PyPDF2 import PdfReader

PDFS = [
    Path(r"c:\Users\IT-STORE\Downloads\AccessScan_Quick_Tests_Collection.pdf"),
    Path(r"c:\Users\IT-STORE\Downloads\AccessScan_Quick_Tests_All_In_One.pdf"),
]

out_dir = Path(__file__).parent

for pdf in PDFS:
    if not pdf.exists():
        print(f"Missing: {pdf}")
        continue
    reader = PdfReader(str(pdf))
    texts = []
    for p in reader.pages:
        try:
            texts.append(p.extract_text() or "")
        except Exception as e:
            texts.append(f"[error extracting page: {e}]")
    out = out_dir / (pdf.stem + ".txt")
    out.write_text("\n\n--- PAGE BREAK ---\n\n".join(texts), encoding="utf-8")
    print(f"Wrote: {out}")

print("Done")
