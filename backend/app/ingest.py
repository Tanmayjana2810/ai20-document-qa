"""
Turn an uploaded file (PDF or .txt) into LlamaIndex `Document` objects.

We support exactly the two formats the assignment asks for. PDFs are parsed
page-by-page with pypdf (pulled in by llama-index-readers-file); .txt files are
read directly. Each Document carries the source file name in its metadata so we
can cite it later.
"""

from pathlib import Path
from llama_index.core import Document
from llama_index.readers.file import PDFReader


def load_document(file_path: str) -> list[Document]:
    path = Path(file_path)
    suffix = path.suffix.lower()

    if suffix == ".pdf":
        # PDFReader returns one Document per page.
        docs = PDFReader().load_data(file=path)
    elif suffix == ".txt":
        text = path.read_text(encoding="utf-8", errors="ignore")
        docs = [Document(text=text)]
    else:
        raise ValueError(f"Unsupported file type: {suffix}. Only .pdf and .txt are allowed.")

    # Stamp every document with its source filename (used for citations).
    for d in docs:
        d.metadata["file_name"] = path.name

    return docs
