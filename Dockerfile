FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent ./agent
COPY config ./config

ENV AGENT_MODE=forever \
    AGENT_INTERVAL_SECONDS=900 \
    AGENT_STATE_DIR=/state

VOLUME ["/state"]

CMD ["python", "-m", "agent.main"]
