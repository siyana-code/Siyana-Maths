import asyncio
import base64
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import httpx
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core.auth import SupabaseJWTVerifier
from app.core.config import Settings


def _int_to_base64(value: int) -> str:
    raw = value.to_bytes((value.bit_length() + 7) // 8, "big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def test_supabase_jwt_verifier_checks_signature_and_claims() -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_numbers = private_key.public_key().public_numbers()
    key_id = "test-key"
    url = "https://example.supabase.co"
    jwk = {
        "kty": "RSA",
        "kid": key_id,
        "use": "sig",
        "alg": "RS256",
        "n": _int_to_base64(public_numbers.n),
        "e": _int_to_base64(public_numbers.e),
    }

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url == httpx.URL(f"{url}/auth/v1/.well-known/jwks.json")
        return httpx.Response(200, json={"keys": [jwk]})

    settings = Settings(
        app_env="test",
        supabase_url=url,
        supabase_anon_key="public-key",
        supabase_jwt_audience="authenticated",
    )
    verifier = SupabaseJWTVerifier(
        settings,
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    subject = str(uuid4())
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "sub": subject,
            "aud": "authenticated",
            "iss": f"{url}/auth/v1",
            "iat": now,
            "exp": now + timedelta(minutes=5),
        },
        private_key,
        algorithm="RS256",
        headers={"kid": key_id},
    )

    verified = asyncio.run(verifier.verify(token))
    asyncio.run(verifier.close())

    assert verified.subject == subject
    assert verified.claims["aud"] == "authenticated"
