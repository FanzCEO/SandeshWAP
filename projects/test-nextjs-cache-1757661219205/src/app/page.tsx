export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-100 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Welcome to Next.js! ⚡
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Get started by editing{' '}
            <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">
              src/app/page.tsx
            </code>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-3">📖 Documentation</h2>
              <p className="text-gray-600">
                Find in-depth information about Next.js features and API.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-3">🎨 Templates</h2>
              <p className="text-gray-600">
                Discover and deploy boilerplate example Next.js projects.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-3">🚀 Deploy</h2>
              <p className="text-gray-600">
                Instantly deploy your Next.js site to a shareable URL.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}