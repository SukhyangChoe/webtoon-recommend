"""Read only a user-provided ZIP index, or extract selected hash-verified assets.

No README/script execution, network access, image transformation, or extractall.
"""
import hashlib
import json
from pathlib import Path, PurePosixPath
import sys
import zipfile


def main():
    archive, mode = sys.argv[1:3]
    with zipfile.ZipFile(archive) as source:
        names = [item.filename for item in source.infolist()]
        if len(names) != len(set(names)):
            raise ValueError('DUPLICATE_ZIP_ENTRY')
        if mode == 'index':
            entry = source.getinfo('cover_index.json')
            if entry.file_size > 10_000_000:
                raise ValueError('INDEX_TOO_LARGE')
            print(source.read(entry).decode('utf-8-sig'))
            return
        if mode != 'extract':
            raise ValueError('INVALID_MODE')
        records = json.loads(Path(sys.argv[3]).read_text())
        root = Path(sys.argv[4]).resolve()
        for record in records:
            relative = PurePosixPath(record['integratedRelativePath'])
            if relative.is_absolute() or '..' in relative.parts or len(relative.parts) != 2 or relative.parts[0] != 'originals':
                raise ValueError('UNSAFE_PATH')
            info = source.getinfo(str(relative))
            if info.file_size != record['byteSize'] or info.file_size > 20_000_000:
                raise ValueError('SIZE_MISMATCH')
            data = source.read(info)  # ZipFile also verifies CRC.
            if hashlib.sha256(data).hexdigest() != record['sha256']:
                raise ValueError('HASH_MISMATCH')
            target = root.joinpath(*relative.parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open('xb') as output:
                output.write(data)
        print(json.dumps({'extracted': len(records)}))


if __name__ == '__main__':
    main()
