"""Safe ZIP extraction helpers for Office documents."""

from __future__ import annotations

import shutil
import stat
import zipfile
from pathlib import Path, PurePosixPath, PureWindowsPath

MAX_ZIP_MEMBERS = 20_000
MAX_UNCOMPRESSED_BYTES = 512 * 1024 * 1024


def safe_extract_zip(
    zip_file: zipfile.ZipFile,
    destination: str | Path,
    *,
    max_members: int = MAX_ZIP_MEMBERS,
    max_uncompressed_bytes: int = MAX_UNCOMPRESSED_BYTES,
) -> None:
    """Extract ZIP members while rejecting traversal, special files, and bombs."""

    destination_path = Path(destination).resolve()
    destination_path.mkdir(parents=True, exist_ok=True)

    members = zip_file.infolist()
    if len(members) > max_members:
        raise ValueError(f"Refusing to extract ZIP with {len(members)} members")

    total_size = 0
    for member in members:
        _validate_member(member, destination_path)
        total_size += member.file_size
        if total_size > max_uncompressed_bytes:
            raise ValueError("Refusing to extract ZIP exceeding uncompressed size limit")

    for member in members:
        target = (destination_path / member.filename).resolve()
        if member.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue

        target.parent.mkdir(parents=True, exist_ok=True)
        with zip_file.open(member, "r") as source, target.open("wb") as output:
            shutil.copyfileobj(source, output)


def _validate_member(member: zipfile.ZipInfo, destination_path: Path) -> None:
    name = member.filename
    parts = PurePosixPath(name).parts
    windows_path = PureWindowsPath(name)
    if (
        not name
        or "\\" in name
        or PurePosixPath(name).is_absolute()
        or windows_path.is_absolute()
        or windows_path.drive
        or any(part in {"", ".", ".."} for part in parts)
    ):
        raise ValueError(f"Unsafe ZIP member path: {name!r}")

    target = (destination_path / name).resolve()
    if target != destination_path and destination_path not in target.parents:
        raise ValueError(f"ZIP member escapes destination: {name!r}")

    mode = (member.external_attr >> 16) & 0o170000
    if mode and not (stat.S_ISREG(mode) or stat.S_ISDIR(mode)):
        raise ValueError(f"Refusing to extract non-regular ZIP member: {name!r}")
