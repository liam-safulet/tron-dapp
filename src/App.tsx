import './App.css'
import { useState } from 'react'
import { createConfig, http, custom } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected, metaMask, walletConnect, coinbaseWallet } from 'wagmi/connectors'
import { 
  WagmiProvider, 
  useAccount, 
  useConnect, 
  useDisconnect,
  useBalance,
  useChainId,
  usePublicClient
} from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 声明 window.ethereum 类型
declare global {
  interface Window {
    ethereum?: any;
  }
}

// 创建使用 window.ethereum 的自定义传输
const createEthereumTransport = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    console.log('✅ 使用 window.ethereum 作为 RPC 提供者')
    return custom({
      request: async ({ method, params }) => {
        console.log('🚀 通过 window.ethereum.request 发送 RPC 请求:', { method, params })
        // 直接使用 window.ethereum.request
        const result = await window.ethereum.request({ method, params })
        console.log('📡 RPC 响应:', result)
        return result
      },
    })
  }
  
  console.log('⚠️ 未检测到 window.ethereum，使用默认 HTTP 传输')
  // 如果没有 window.ethereum，使用默认的 HTTP 传输
  return http()
}

// 创建 wagmi 配置
const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId: 'YOUR_PROJECT_ID', // 需要替换为你的 WalletConnect Project ID
    }),
    coinbaseWallet({
      appName: 'Wagmi RPC Example App',
    }),
  ],
  transports: {
    [mainnet.id]: createEthereumTransport(),
    [sepolia.id]: createEthereumTransport(),
  },
})

// 创建 QueryClient 实例
const queryClient = new QueryClient()

// RPC 请求示例组件
const RPCExample = () => {
  const [rpcResult, setRpcResult] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [rpcMethod, setRpcMethod] = useState('eth_blockNumber')
  const [rpcParams, setRpcParams] = useState('[]')
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({
    address,
  })
  const chainId = useChainId()
  const publicClient = usePublicClient()

  // 通过 wagmi 的 publicClient 执行 RPC 请求
  const executeRPC = async () => {
    if (!isConnected) {
      alert('请先连接钱包')
      return
    }

    if (!publicClient) {
      alert('Public client 未初始化')
      return
    }

    setLoading(true)
    try {
      let params: any[] = []
      
      // 解析参数
      try {
        params = JSON.parse(rpcParams)
      } catch (e) {
        console.warn('参数解析失败，使用空数组')
      }

      // 使用 wagmi 的 publicClient 发送 RPC 请求
      console.log('🔧 通过 wagmi publicClient 发送 RPC 请求')
      const result = await publicClient.request({
        method: rpcMethod as any,
        params: params as any,
      })
      
      console.log('✅ RPC 请求完成，结果:', result)
      
      setRpcResult(JSON.stringify({
        method: rpcMethod,
        params: params,
        result: result,
        timestamp: new Date().toISOString(),
        chainId: chainId
      }, null, 2))
    } catch (error) {
      setRpcResult(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        method: rpcMethod,
        params: rpcParams,
        timestamp: new Date().toISOString(),
        chainId: chainId
      }, null, 2))
    } finally {
      setLoading(false)
    }
  }

  // 预设的 RPC 方法示例
  const rpcExamples = [
    {
      name: '获取区块号',
      method: 'eth_blockNumber',
      params: '[]'
    },
    {
      name: '获取账户余额',
      method: 'eth_getBalance',
      params: `["${address || '0x0000000000000000000000000000000000000000'}", "latest"]`
    },
    {
      name: '获取 Gas 价格',
      method: 'eth_gasPrice',
      params: '[]'
    },
    {
      name: '获取网络版本',
      method: 'net_version',
      params: '[]'
    },
    {
      name: '获取链 ID',
      method: 'eth_chainId',
      params: '[]'
    },
    {
      name: '获取账户数量',
      method: 'eth_accounts',
      params: '[]'
    },
    {
      name: '获取最新区块',
      method: 'eth_getBlockByNumber',
      params: '["latest", false]'
    },
    {
      name: '获取交易收据',
      method: 'eth_getTransactionReceipt',
      params: '["0x0000000000000000000000000000000000000000000000000000000000000000"]'
    }
  ]

  const selectExample = (example: typeof rpcExamples[0]) => {
    setRpcMethod(example.method)
    setRpcParams(example.params)
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Wagmi RPC 请求示例</h1>
      
      {/* 钱包连接状态 */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>钱包状态</h3>
        <p><strong>连接状态:</strong> {isConnected ? '✅ 已连接' : '❌ 未连接'}</p>
        {address && <p><strong>地址:</strong> {address}</p>}
        {balance && <p><strong>余额:</strong> {balance.formatted} {balance.symbol}</p>}
        <p><strong>当前链 ID:</strong> {chainId}</p>
      </div>

      {/* RPC 请求表单 */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>RPC 请求 (通过 Wagmi)</h3>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
          所有 RPC 请求都通过 wagmi 的 publicClient 发送
        </p>
        
        <div style={{ marginBottom: '15px' }}>
          <label>RPC 方法:</label>
          <input
            type="text"
            value={rpcMethod}
            onChange={(e) => setRpcMethod(e.target.value)}
            placeholder="例如: eth_blockNumber"
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '5px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>参数 (JSON 格式):</label>
          <textarea
            value={rpcParams}
            onChange={(e) => setRpcParams(e.target.value)}
            placeholder='例如: ["0x123...", "latest"]'
            rows={3}
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '5px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              resize: 'vertical'
            }}
          />
        </div>

        <button
          onClick={executeRPC}
          disabled={loading || !isConnected}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (loading || !isConnected) ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? '请求中...' : '执行 RPC 请求'}
        </button>

        <button
          onClick={() => {
            setRpcMethod('')
            setRpcParams('[]')
            setRpcResult('')
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          清空
        </button>
      </div>

      {/* RPC 示例 */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>RPC 方法示例</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {rpcExamples.map((example, index) => (
            <button
              key={index}
              onClick={() => selectExample(example)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {example.name}
            </button>
          ))}
        </div>
      </div>

      {/* RPC 结果显示 */}
      {rpcResult && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '15px',
          borderRadius: '8px'
        }}>
          <h3>RPC 响应结果</h3>
          <pre style={{
            backgroundColor: '#e9ecef',
            padding: '10px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px',
            maxHeight: '400px'
          }}>
            {rpcResult}
          </pre>
        </div>
      )}
    </div>
  )
}

// 钱包连接组件
const WalletConnect = () => {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <h3>连接钱包</h3>
      
      {isConnected ? (
        <div>
          <p><strong>已连接地址:</strong> {address}</p>
          <p><strong>当前链 ID:</strong> {chainId}</p>
          
          <button
            onClick={() => disconnect()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            断开连接
          </button>
        </div>
      ) : (
        <div>
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => connect({ connector })}
              disabled={!connector.ready}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px',
                marginBottom: '8px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: connector.ready ? 'pointer' : 'not-allowed'
              }}
            >
              {connector.name}
              {!connector.ready && ' (未安装)'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// 主应用组件
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <div className="App">
          <WalletConnect />
          <RPCExample />
        </div>
      </WagmiProvider>
    </QueryClientProvider>
  )
}

export default App