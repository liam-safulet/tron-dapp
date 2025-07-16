import './App.css'
import { useState } from 'react'

// 声明 window.ethereum 类型
declare global {
  interface Window {
    ethereum?: any;
  }
}

// RPC 请求示例组件
const RPCExample = () => {
  const [rpcResult, setRpcResult] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [rpcMethod, setRpcMethod] = useState('eth_blockNumber')
  const [rpcParams, setRpcParams] = useState('[]')
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string>('')

  // 连接钱包
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('请安装 MetaMask 钱包')
      return
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })
      
      if (accounts.length > 0) {
        setAddress(accounts[0])
        setIsConnected(true)
        alert('钱包连接成功！')
      }
    } catch (error) {
      console.error('连接钱包失败:', error)
      alert('连接钱包失败')
    }
  }

  // 断开连接
  const disconnectWallet = () => {
    setAddress('')
    setIsConnected(false)
    setRpcResult('')
    alert('钱包已断开连接')
  }

  // 自定义 RPC 请求函数
  const requestRPC = async (method: string, params: any[] = []) => {
    if (!window.ethereum) {
      throw new Error('MetaMask not found')
    }

    try {
      const result = await window.ethereum.request({
        method,
        params,
      })
      return result
    } catch (error) {
      throw error
    }
  }

  // 执行 RPC 请求
  const executeRPC = async () => {
    if (!isConnected) {
      alert('请先连接钱包')
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

      const result = await requestRPC(rpcMethod, params)
      
      setRpcResult(JSON.stringify({
        method: rpcMethod,
        params: params,
        result: result,
        timestamp: new Date().toISOString()
      }, null, 2))
    } catch (error) {
      setRpcResult(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        method: rpcMethod,
        params: rpcParams,
        timestamp: new Date().toISOString()
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
    }
  ]

  const selectExample = (example: typeof rpcExamples[0]) => {
    setRpcMethod(example.method)
    setRpcParams(example.params)
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Ethereum RPC 请求示例</h1>
      
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
        
        {!isConnected ? (
          <button
            onClick={connectWallet}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            连接 MetaMask
          </button>
        ) : (
          <button
            onClick={disconnectWallet}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            断开连接
          </button>
        )}
      </div>

      {/* RPC 请求表单 */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>RPC 请求</h3>
        
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

// 主应用组件
function App() {
  return (
    <div className="App">
      <RPCExample />
    </div>
  )
}

export default App