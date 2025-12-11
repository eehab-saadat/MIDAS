# 📱 Local Network Mobile Setup Guide

This guide will help you use the mobile camera feature with your localhost development server.

## Quick Setup (3 Steps)

### Step 1: Run Next.js on Your Local Network

By default, Next.js only listens on `localhost` (127.0.0.1). To allow mobile devices on your WiFi to connect, you need to bind to all network interfaces.

**Update your `package.json` script:**

```json
{
  "scripts": {
    "dev": "next dev -H 0.0.0.0"
  }
}
```

Or run directly:
```bash
npm run dev -- -H 0.0.0.0
```

### Step 2: Find Your Local IP Address

**Windows:**
```cmd
ipconfig
```
Look for `IPv4 Address` under your active network adapter (usually starts with `192.168.x.x` or `10.x.x.x`)

**Mac/Linux:**
```bash
ifconfig
# or
ip addr show
```
Look for `inet` address under your active network interface (en0, wlan0, etc.)

**Example Output:**
```
IPv4 Address: 192.168.1.100
```

### Step 3: Use the Mobile Camera Feature

1. Click the **📱 Smartphone icon** in the Session Entries section
2. The system will automatically detect your local IP address
3. Click **"Use This IP for QR Code"** button
4. Scan the QR code with your mobile device (must be on same WiFi)
5. Take photos on your mobile - they'll appear automatically in the session!

## How It Works

1. **Frontend (Next.js)**: Runs on `http://YOUR_IP:3000`
2. **Backend (Python Flask)**: Should already be accessible on network
3. **Mobile Device**: Accesses the special `/mobile-camera` page via the QR code
4. **Image Upload**: Images are stored temporarily in memory and polled by the main session

## Troubleshooting

### Mobile device can't connect

**Check Firewall:**
- **Windows**: Allow Node.js through Windows Firewall
  - Settings → Privacy & Security → Windows Security → Firewall & network protection
  - Allow an app through firewall → Node.js
  
- **Mac**: System Preferences → Security & Privacy → Firewall → Firewall Options
  - Allow incoming connections for Node

**Check Network:**
- Ensure both devices are on the **same WiFi network**
- Some public WiFi networks block device-to-device communication (use hotspot)

### Auto-detection doesn't find IP

If automatic detection fails:
1. Click **"Enter Custom URL"**
2. Manually enter: `http://YOUR_IP:3000` (e.g., `http://192.168.1.100:3000`)
3. The QR code will update automatically

### Backend not accessible from mobile

If you're running the Python backend, ensure it's also accessible:

**In `backend/app.py`, check the Flask run command:**
```python
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
```

The `host="0.0.0.0"` allows network access.

## Alternative Options

### Option 1: Use Your Phone's Hotspot
1. Enable hotspot on your phone
2. Connect your computer to the phone's hotspot
3. Find your computer's IP in the hotspot network
4. Use that IP in the QR code

### Option 2: Use a Tunnel Service (Advanced)

If you can't get local network working, you can use a tunnel service:

**ngrok (Recommended):**
```bash
# Install ngrok
npm install -g ngrok

# In one terminal, run your Next.js app
npm run dev

# In another terminal, create tunnel
ngrok http 3000
```

Copy the `https://` URL from ngrok output and paste it in the "Enter Custom URL" field.

**localtunnel:**
```bash
npx localtunnel --port 3000
```

## Security Note

When using `0.0.0.0`, your development server is accessible to anyone on your local network. This is safe for:
- Home WiFi networks
- Trusted office networks

**Do NOT use this on:**
- Public WiFi (coffee shops, airports, etc.)
- Untrusted networks

For public networks, use your phone's hotspot or a tunnel service.

## Testing the Setup

1. Start your dev server with `-H 0.0.0.0`
2. Find your local IP: `192.168.x.x`
3. Open browser on mobile: `http://192.168.x.x:3000`
4. If you see your app, it's working! ✅
5. Now use the QR code feature normally

## Questions?

If you're still having issues:
1. Check that both devices show the same WiFi network name
2. Try pinging your computer from mobile (use a network tool app)
3. Temporarily disable firewall to test if it's the issue
4. Check router settings for "AP Isolation" (should be disabled)

