import './App.css'
import {useState, useEffect} from 'react'
import {TronWeb, Trx} from 'tronweb';

declare global {
    interface Window {
        binancew3w?: {
            tron: {
                getAccount(): Promise<{ address: string }>;
                signMessage(message: string): Promise<string>;
                signTransaction(tx: unknown): Promise<unknown>;
                signAndSendTransaction(tx: unknown): Promise<{ txid?: string; result?: boolean }>;
                disconnect(): Promise<void>;
            }
        }
    }
}

interface TronTransaction {
    result?: {
        result?: boolean;
    };
    transaction?: unknown;
}

const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io', // 主网
    // fullHost: 'https://api.nileex.io', // 测试网
});

function App() {
    const [account, setAccount] = useState<string>('');
    const [balance, setBalance] = useState<string>('0');
    const [loading, setLoading] = useState<boolean>(false);
    const [signedData, setSignedData] = useState<string>('');
    const [recipient, setRecipient] = useState<string>('TASoYA4UCoQWZgtipn6sHZJkokiU7GTzkK');
    const [amount, setAmount] = useState<string>('0.1');

    // 添加消息签名相关状态
    const [message, setMessage] = useState<string>('Hello, Binance W3W!');
    const [signedMessage, setSignedMessage] = useState<string>('');

    // USDT TRC20 合约地址
    const CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
    // transfer(address,uint256) 函数选择器
    const TRANSFER_FUNCTION_SELECTOR = 'a9059cbb';

    useEffect(() => {
        const initialize = async () => {
            await checkWalletConnection();
        };
        initialize().catch((error) => {
            console.error('Initialization error:', error);
        });
    }, []);

    // 检查钱包连接状态
    const checkWalletConnection = async (): Promise<void> => {
        try {
            if (window.binancew3w?.tron) {
                // 尝试获取账户信息
                const {address} = await window.binancew3w.tron.getAccount();
                if (address) {
                    setAccount(address);
                    await getBalance(address);
                }
            }
        } catch (error) {
            console.log(error);
            // 静默处理连接检查错误，因为钱包可能未连接
        }
    };

    // 获取余额
    const getBalance = async (address: string): Promise<void> => {
        try {
            const balanceResult = await tronWeb.trx.getBalance(address);
            setBalance(String(tronWeb.fromSun(balanceResult)));
        } catch (error) {
            console.error('Error getting balance:', error);
        }
    };

    // 连接钱包
    const connectWallet = async (): Promise<void> => {
        try {
            if (!window.binancew3w?.tron) {
                alert('请先安装 Binance Web3 Wallet');
                return;
            }

            setLoading(true);

            // 获取账户
            const {address} = await window.binancew3w.tron.getAccount();

            if (address) {
                setAccount(address);
                await getBalance(address);
                alert('钱包连接成功！');
            } else {
                throw new Error('获取账户地址失败');
            }
        } catch (error) {
            console.error('连接钱包失败:', error);
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            alert('连接钱包失败: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // 断开连接
    const disconnectWallet = async (): Promise<void> => {
        try {
            if (window.binancew3w?.tron) {
                await window.binancew3w.tron.disconnect();
            }
            setAccount('');
            setBalance('0');
            setSignedData('');
            setSignedMessage('');
            setRecipient('TASoYA4UCoQWZgtipn6sHZJkokiU7GTzkK');
            setAmount('0.1');
            setMessage('Hello, Binance W3W!');
            alert('钱包已断开连接');
        } catch (error) {
            console.error('断开连接失败:', error);
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            alert('断开连接失败: ' + errorMessage);
        }
    };

    // 构建智能合约交易参数 - 恢复正确的对象数组格式
    const buildContractParameters = (recipientAddress: string, transferAmount: string): {
        type: string,
        value: string
    }[] => {
        const amountInWei = Math.floor(Number(transferAmount) * 1000000); // USDT 有 6 位小数，确保是整数
        return [
            {type: 'address', value: recipientAddress},
            {type: 'uint256', value: String(amountInWei)}
        ];
    };

    // 构建交易对象 - 修复函数选择器格式
    const buildTransaction = async (recipientAddress: string, transferAmount: string): Promise<unknown> => {
        try {
            const parameters = buildContractParameters(recipientAddress, transferAmount);

            console.log('构建交易参数:', {
                CONTRACT_ADDRESS,
                TRANSFER_FUNCTION_SELECTOR,
                parameters,
                account
            });

            // 尝试不同的函数选择器格式
            const functionSelector = 'transfer(address,uint256)'; // 使用完整函数签名而不是哈希

            console.log('使用函数选择器:', functionSelector);

            const transaction: TronTransaction = await tronWeb.transactionBuilder.triggerSmartContract(
                CONTRACT_ADDRESS,
                functionSelector, // 使用完整函数签名
                {
                    feeLimit: 50000000, // 50 TRX 费用限制
                    callValue: 0, // 不发送 TRX
                },
                parameters,
                account
            );

            if (!transaction.result?.result) {
                throw new Error('构建交易失败: ' + JSON.stringify(transaction.result));
            }

            return transaction.transaction;
        } catch (error) {
            console.error('构建交易失败:', error);
            throw error;
        }
    };

    // 只签名智能合约交易
    const signTransaction = async (): Promise<void> => {
        if (!account || !recipient || !amount) {
            alert('请填写完整信息');
            return;
        }

        try {
            setLoading(true);

            if (!window.binancew3w?.tron) {
                throw new Error('钱包未连接');
            }

            // 构建交易
            const transaction = await buildTransaction(recipient, amount);
            console.log('Original transaction:', transaction);

            // 使用新的 provider 签名交易
            const signedTx = await window.binancew3w.tron.signTransaction(transaction);
            console.log('Signed transaction:', signedTx);

            // 验证签名
            const isValidSignature = await verifyTransactionSignature(transaction, signedTx, account);

            const result = {
                originalTransaction: transaction,
                signedTransaction: signedTx,
                signatureValid: isValidSignature,
                verificationResult: isValidSignature ? '✅ 签名验证成功' : '❌ 签名验证失败',
                signedAt: new Date().toISOString(),
                address: account
            };

            setSignedData(JSON.stringify(result, null, 2));

        } catch (error) {
            console.error('签名失败:', error);
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            alert('签名失败: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // 验证交易签名的函数
    const verifyTransactionSignature = async (
        _originalTransaction: unknown,
        signedTransaction: unknown,
        signerAddress: string
    ): Promise<boolean> => {
        try {
            console.log('开始验证签名...');

            // 方法1: 使用 TronWeb 验证签名
            if (typeof signedTransaction === 'object' && signedTransaction !== null) {
                const tx = signedTransaction as {
                    signature?: string[];
                    txID?: string;
                    raw_data?: unknown;
                };

                if (tx.signature && tx.signature.length > 0 && tx.txID) {
                    // 使用 TronWeb 验证签名
                    const isValid = await Trx.verifySignature(
                        tx.txID,
                        signerAddress,
                        tx.signature[0]
                    );

                    console.log('TronWeb 签名验证结果:', isValid);
                    return isValid;
                }
            }

            // 方法2: 检查签名格式和基本信息
            const txObj = signedTransaction as {
                signature?: string[];
                txID?: string;
                raw_data?: { owner_address?: string };
            };

            if (!txObj.signature || txObj.signature.length === 0) {
                console.error('签名不存在');
                return false;
            }

            if (!txObj.txID) {
                console.error('交易ID不存在');
                return false;
            }

            // 检查签名格式 (应该是十六进制字符串)
            const signature = txObj.signature[0];
            const isValidHex = /^[0-9A-Fa-f]+$/.test(signature);
            const isValidLength = signature.length === 130; // 65 bytes * 2

            console.log('签名格式检查:', {
                signature: signature.substring(0, 20) + '...',
                isValidHex,
                isValidLength,
                length: signature.length
            });

            // 检查交易中的地址是否匹配
            if (txObj.raw_data?.owner_address) {
                const ownerAddress = tronWeb.address.fromHex(txObj.raw_data.owner_address);
                const addressMatch = ownerAddress === signerAddress;
                console.log('地址匹配检查:', {
                    ownerAddress,
                    signerAddress,
                    addressMatch
                });

                return isValidHex && isValidLength && addressMatch;
            }

            return isValidHex && isValidLength;

        } catch (error) {
            console.error('验证签名时出错:', error);
            return false;
        }
    };

    // 新增：验证消息签名的函数
    const verifyMessageSignature = async (
        originalMessage: string,
        signature: string,
        signerAddress: string
    ): Promise<boolean> => {
        try {
            console.log('开始验证消息签名...');

            // 将消息转换为十六进制
            const hexMessage = tronWeb.toHex(originalMessage);

            // 使用 TronWeb 验证消息签名
            const isValid = await Trx.verifySignature(
                hexMessage,
                signerAddress,
                signature
            );

            console.log('消息签名验证结果:', isValid);
            return isValid;

        } catch (error) {
            console.error('验证消息签名时出错:', error);
            return false;
        }
    };

    // 签名消息 - 添加签名验证
    const signMessage = async (): Promise<void> => {
        if (!account || !message.trim()) {
            alert('请确保钱包已连接且消息不为空');
            return;
        }

        try {
            setLoading(true);

            if (!window.binancew3w?.tron) {
                throw new Error('钱包未连接');
            }

            console.log('Signing message:', message);

            // 使用新的 provider 签名消息
            const signature = await window.binancew3w.tron.signMessage(message);

            // 验证消息签名
            const isValidSignature = await verifyMessageSignature(message, signature, account);

            const signatureData = {
                originalMessage: message,
                signature: signature,
                signatureValid: isValidSignature,
                verificationResult: isValidSignature ? '✅ 签名验证成功' : '❌ 签名验证失败',
                signedAt: new Date().toISOString(),
                address: account,
                method: 'binancew3w.tron.signMessage'
            };

            setSignedMessage(JSON.stringify(signatureData, null, 2));

        } catch (error) {
            console.error('消息签名失败:', error);
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            alert('消息签名失败: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // 签名并发送智能合约交易
    const signAndSendTransaction = async (): Promise<void> => {
        if (!account || !recipient || !amount) {
            alert('请填写完整信息');
            return;
        }

        try {
            setLoading(true);

            if (!window.binancew3w?.tron) {
                throw new Error('钱包未连接');
            }

            // 构建交易
            const transaction = await buildTransaction(recipient, amount);

            // 使用新的 provider 签名并发送交易
            const result = await window.binancew3w.tron.signAndSendTransaction(transaction);

            setSignedData(JSON.stringify(result, null, 2));

            if (result.result) {
                alert('智能合约交易发送成功！');
                // 更新余额
                await getBalance(account);
            } else {
                alert('交易发送失败');
            }
        } catch (error) {
            console.error('交易失败:', error);
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            alert('交易失败: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setRecipient(e.target.value);
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setAmount(e.target.value);
    };

    const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
        setMessage(e.target.value);
    };

    return (
        <div className="App" style={{padding: '20px', maxWidth: '600px', margin: '0 auto'}}>
            <h1>Binance Web3 Wallet - Tron dApp</h1>

            {!account ? (
                <div style={{textAlign: 'center', marginTop: '50px'}}>
                    <button
                        onClick={connectWallet}
                        disabled={loading}
                        style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? '连接中...' : '连接 Binance Web3 钱包'}
                    </button>
                </div>
            ) : (
                <div>
                    {/* 钱包信息 */}
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <h3>钱包信息</h3>
                        <p><strong>地址:</strong> {account}</p>
                        <p><strong>TRX 余额:</strong> {balance} TRX</p>
                        <button
                            onClick={disconnectWallet}
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

                    {/* 消息签名部分 */}
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <h3>消息签名</h3>
                        <p style={{fontSize: '14px', color: '#666', marginBottom: '15px'}}>
                            使用 binancew3w.tron.signMessage() 方法签名消息
                        </p>

                        <div style={{marginBottom: '15px'}}>
                            <label>要签名的消息:</label>
                            <textarea
                                value={message}
                                onChange={handleMessageChange}
                                placeholder="输入要签名的消息"
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
                            onClick={signMessage}
                            disabled={loading}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#6f42c1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? '签名中...' : '签名消息'}
                        </button>
                    </div>

                    {/* 智能合约交易表单 */}
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <h3>USDT 转账 (TRC20)</h3>
                        <p style={{fontSize: '14px', color: '#666', marginBottom: '15px'}}>
                            合约地址: {CONTRACT_ADDRESS}
                        </p>

                        <div style={{marginBottom: '15px'}}>
                            <label>接收地址:</label>
                            <input
                                type="text"
                                value={recipient}
                                onChange={handleRecipientChange}
                                placeholder="输入接收地址"
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    marginTop: '5px',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd'
                                }}
                            />
                        </div>
                        <div style={{marginBottom: '15px'}}>
                            <label>金额 (USDT):</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={handleAmountChange}
                                placeholder="输入金额"
                                step="0.000001"
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    marginTop: '5px',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd'
                                }}
                            />
                        </div>

                        <div style={{display: 'flex', gap: '10px'}}>
                            <button
                                onClick={signTransaction}
                                disabled={loading}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? '处理中...' : '仅签名交易'}
                            </button>
                            <button
                                onClick={signAndSendTransaction}
                                disabled={loading}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? '处理中...' : '签名并发送'}
                            </button>
                        </div>
                    </div>

                    {/* 消息签名结果显示 */}
                    {signedMessage && (
                        <div style={{
                            backgroundColor: '#f8f9fa',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <h3>消息签名结果</h3>
                            {/* 添加验证状态指示器 */}
                            <div style={{
                                marginBottom: '10px',
                                padding: '8px',
                                borderRadius: '4px',
                                backgroundColor: JSON.parse(signedMessage).signatureValid ? '#d4edda' : '#f8d7da',
                                color: JSON.parse(signedMessage).signatureValid ? '#155724' : '#721c24',
                                fontWeight: 'bold'
                            }}>
                                {JSON.parse(signedMessage).verificationResult}
                            </div>
                            <pre style={{
                                backgroundColor: '#e9ecef',
                                padding: '10px',
                                borderRadius: '4px',
                                overflow: 'auto',
                                fontSize: '12px'
                            }}>
                                {signedMessage}
                            </pre>
                        </div>
                    )}

                    {/* 交易数据显示 */}
                    {signedData && (
                        <div style={{
                            backgroundColor: '#f8f9fa',
                            padding: '15px',
                            borderRadius: '8px'
                        }}>
                            <h3>智能合约交易数据</h3>
                            {/* 添加验证状态指示器 */}
                            <div style={{
                                marginBottom: '10px',
                                padding: '8px',
                                borderRadius: '4px',
                                backgroundColor: JSON.parse(signedData).signatureValid ? '#d4edda' : '#f8d7da',
                                color: JSON.parse(signedData).signatureValid ? '#155724' : '#721c24',
                                fontWeight: 'bold'
                            }}>
                                {JSON.parse(signedData).verificationResult}
                            </div>
                            <pre style={{
                                backgroundColor: '#e9ecef',
                                padding: '10px',
                                borderRadius: '4px',
                                overflow: 'auto',
                                fontSize: '12px'
                            }}>
                                {signedData}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App