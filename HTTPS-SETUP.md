# HTTPS Setup for VoiceTask AI

This document explains the technical implementation of HTTPS for VoiceTask AI to enable voice recording on mobile devices.

## Why HTTPS is Necessary

Modern browsers require a secure context (HTTPS) to access certain web APIs, including:
- `getUserMedia()` - Required for microphone access
- `MediaRecorder` - Required for recording audio
- Geolocation API
- Device orientation/motion APIs
- Service Workers

Without HTTPS, mobile browsers will prevent the application from accessing the microphone, making voice recording impossible.

## Implementation Methods

We've implemented three methods for enabling HTTPS in development:

### 1. HTTPS with mkcert (Recommended)

Uses locally trusted certificates generated with mkcert.

**Key Components:**
- `start-https.sh` - Main setup script
- `certs/` directory - Stores the generated SSL certificates
- `https-localhost` npm package - Simplifies HTTPS setup for Next.js

**Configuration Files:**
- `next.config.ts` - Loads SSL certificates for the Next.js dev server
- `api/app/config.py` - CORS configuration for the FastAPI backend

**How It Works:**
1. Generate local SSL certificates using mkcert
2. Configure Next.js to use these certificates
3. Configure FastAPI to use these certificates
4. Update CORS settings to allow HTTPS origins
5. Ensure the frontend API service uses HTTPS URLs

### 2. HTTPS with ngrok (Alternative)

Uses ngrok tunnels to expose HTTPS endpoints.

**Key Components:**
- `start-with-ngrok.sh` - Ngrok setup script

**How It Works:**
1. Start local HTTP servers (Next.js and FastAPI)
2. Create an ngrok tunnel to the Next.js server (HTTPS)
3. Configure CORS to allow requests from ngrok domains

### 3. HTTPS with https-localhost Package

Used as a backup approach in the `dev-secure` npm script.

**How It Works:**
1. The `https-localhost` package provides a simple way to create a local HTTPS server
2. Wraps the Next.js development server with HTTPS

## Technical Configuration

### Frontend (Next.js)

**HTTPS Configuration in next.config.ts:**
```typescript
// Read environment variables
const https = process.env.HTTPS === 'true';
const sslCertFile = process.env.SSL_CRT_FILE;
const sslKeyFile = process.env.SSL_KEY_FILE;

// Configure HTTPS if enabled
const serverOptions: any = {};
if (https && sslCertFile && sslKeyFile) {
  try {
    serverOptions.https = {
      key: fs.readFileSync(sslKeyFile),
      cert: fs.readFileSync(sslCertFile),
    };
    console.log('HTTPS enabled for development server');
  } catch (error) {
    console.error('Failed to load SSL certificates:', error);
  }
}

const nextConfig: NextConfig = {
  // Pass server options to development server
  devServer: serverOptions,
};
```

**API URL Configuration for HTTPS in src/services/api.ts:**
```typescript
// Determine API URL based on frontend protocol
if (typeof window !== 'undefined') {
  const isHttps = window.location.protocol === 'https:';
  
  // If on local network IP, use same IP for API with matching protocol
  if (window.location.hostname.match(/^192\.168\./)) {
    return isHttps 
      ? `https://${window.location.hostname}:8003` 
      : `http://${window.location.hostname}:8003`;
  }
}
```

### Backend (FastAPI)

**CORS Configuration for HTTPS:**
```python
# CORS settings
CORS_ORIGINS: list[str] = [
    "https://localhost:3000",                                      # HTTPS local development
    "https://127.0.0.1:3000",                                      # HTTPS local development alternative
    "https://192.168.1.214:3000",                                    # HTTPS local IP for mobile testing
    # ... other origins ...
]
```

**Starting FastAPI with HTTPS:**
```bash
python -m uvicorn app.main:app --port 8003 --host 0.0.0.0 --reload --ssl-keyfile="$CERT_DIR/localhost+3-key.pem" --ssl-certfile="$CERT_DIR/localhost+3.pem"
```

## Testing HTTPS Setup

The `test-https-connection.js` script helps verify that HTTPS is correctly configured by:
1. Testing the API connectivity over HTTPS
2. Verifying CORS headers in the API response
3. Checking that SSL certificates are correctly loaded

## Troubleshooting

Common issues:
1. **Certificate not trusted** - Install mkcert's root CA on all devices
2. **CORS errors** - Ensure all origins are properly listed in the API configuration
3. **Mixed content errors** - Ensure all API calls use HTTPS when the frontend is HTTPS
4. **IP address changes** - The start-https.sh script detects your local IP address automatically

## Security Considerations

- The self-signed certificates are only for development purposes
- In production, use professionally signed certificates from a trusted CA
- The current setup exposes your backend on your local network - restrict this in production 