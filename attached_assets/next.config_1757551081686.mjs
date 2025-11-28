export default {
  output: "standalone",
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:3001/api/:path*" },
      { source: "/ws/pty", destination: "http://localhost:3001/ws/pty" }
    ];
  }
};