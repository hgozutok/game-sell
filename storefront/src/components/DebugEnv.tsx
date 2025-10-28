'use client'

export default function DebugEnv() {
  if (process.env.NODE_ENV === 'production') return null
  
  return (
    <div className="fixed bottom-4 right-4 bg-red-900 text-white p-4 rounded-lg text-xs z-50 max-w-md">
      <div className="font-bold mb-2">🐛 Debug Info:</div>
      <div>Backend URL: {process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'NOT SET'}</div>
      <div>Publishable Key: {process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ? '✅ Set' : '❌ NOT SET'}</div>
      <div className="mt-2 text-gray-300">
        If backend URL is "NOT SET", restart: npm run dev
      </div>
    </div>
  )
}

