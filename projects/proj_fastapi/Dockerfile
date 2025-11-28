# build stage
FROM python:3.11-slim AS build
WORKDIR /app
ENV PIP_NO_CACHE_DIR=1 POETRY_VIRTUALENVS_CREATE=false
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml ./
RUN pip install --upgrade pip uv && uv pip install -r pyproject.toml --system

# runtime
FROM gcr.io/distroless/python3-debian12:nonroot
WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    UVICORN_WORKERS=4 \
    UVICORN_PORT=8000
COPY --from=build /usr/local /usr/local
COPY app ./app
EXPOSE 8000
CMD ["/usr/local/bin/uvicorn","app.main:app","--host","0.0.0.0","--port","8000","--workers","4"]