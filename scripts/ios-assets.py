"""Apply packaged Neon artwork to the generated iOS project."""
from pathlib import Path
import subprocess
root = Path(__file__).resolve().parent.parent
subprocess.run(['node', str(root / 'scripts/mobile-platform-assets.cjs'), '--ios'], check=True, cwd=root)
