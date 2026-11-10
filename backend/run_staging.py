"""WealthOS Staging Backend Server Launcher.

Loads backend/.env.staging, configures staging environment variables,
and launches uvicorn on host 0.0.0.0 port 8001.
"""

import os
from pathlib import Path
from dotenv import dotenv_values
import uvicorn

env_staging = Path(__file__).parent / ".env.staging"
if env_staging.exists():
    for k, v in dotenv_values(env_staging).items():
        if v is not None:
            os.environ[k] = v

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8005, log_level="info")
