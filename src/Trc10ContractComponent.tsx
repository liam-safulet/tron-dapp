import React, { useState } from 'react';
import { TronWeb } from 'tronweb';

// TRC-10 智能合约组件的 Props 接口
interface Trc10ContractComponentProps {
    account: string;
    tronWeb: TronWeb;
    binanceW3W: any;
    onBalanceUpdate: (address: string) => Promise<void>;
}

// TRC-10 代币转账结果接口
interface Trc10TransferResult {
    originalTransaction: unknown;
    signedTransaction?: unknown;
    broadcastResult?: unknown;
    txid?: string;
    success: boolean;
    signedAt: string;
    address: string;
    method: 'signTransaction' | 'signAndSendTransaction';
    tokenId: string;
    tokenInfo?: string;
}

// TRON 交易接口
interface TronTransaction {
    result?: {
        result?: boolean;
    };
    transaction?: unknown;
}

const Trc10ContractComponent: React.FC<Trc10ContractComponentProps> = ({
    account,
    tronWeb,
    binanceW3W,
    onBalanceUpdate
}) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [contractAddress, setContractAddress] = useState<string>('TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7'); // WINkLink 智能合约地址
    const [recipient, setRecipient] = useState<string>('TUaRyMRuzyX6tHZRoHz645PL1bn3E5NrWC');
    const [amount, setAmount] = useState<string>('1.0');
    const [decimals, setDecimals] = useState<string>('6'); // 代币精度
    const [trc10TransferData, setTrc10TransferData] = useState<string>('');

    // transfer(address,uint256) 函数选择器
    const TRANSFER_FUNCTION_SELECTOR = 'transfer(address,uint256)';

    // 常见的可通过智能合约调用的 TRC-10/TRC-20 代币
    const smartContractTokens = [
        { address: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7', name: 'WINkLink (WIN)', decimals: 6, symbol: 'WIN', type: 'TRC-20' },
        { address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', name: 'Tether USD (USDT)', decimals: 6, symbol: 'USDT', type: 'TRC-20' },
        { address: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8', name: 'USDC', decimals: 6, symbol: 'USDC', type: 'TRC-20' },
        { address: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', name: 'JustStableCoin (USDJ)', decimals: 18, symbol: 'USDJ', type: 'TRC-20' },
        { address: 'TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9', name: 'JustSwap Token (JST)', decimals: 18, symbol: 'JST', type: 'TRC-20' },
    ];

    // 构建智能合约交易参数
    const buildContractParameters = (recipientAddress: string, transferAmount: string, tokenDecimals: string): {
        type: string,
        value: string
    }[] => {
        const decimalsNum = parseInt(tokenDecimals);
        const amountInWei = Math.floor(Number(transferAmount) * Math.pow(10, decimalsNum));
        return [
            {type: 'address', value: recipientAddress},
            {type: 'uint256', value: String(amountInWei)}
        ];
    };

    // 构建智能合约交易
    const buildTrc10Transaction = async (contractAddr: string, recipientAddress: string, transferAmount: string, tokenDecimals: string): Promise<unknown> => {
        try {
            const parameters = buildContractParameters(recipientAddress, transferAmount, tokenDecimals);

            console.log('构建智能合约交易参数:', {
                contractAddress: contractAddr,
                functionSelector: TRANSFER_FUNCTION_SELECTOR,
                parameters,
                account
            });

            // 使用 triggerSmartContract 调用合约的 transfer 函数
            const transaction: TronTransaction = await tronWeb.transactionBuilder.triggerSmartContract(
                contractAddr,
                TRANSFER_FUNCTION_SELECTOR,
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
            console.error('构建智能合约交易失败:', error);
            throw error;
        }
    };

    // 验证智能合约交易参数
    const validateTrc10Params = (contractAddr: string, recipientAddr: string, transferAmount: string): void => {
        if (!account || !contractAddr || !recipientAddr || !transferAmount) {
            throw new Error('智能合约交易参数不完整');
        }
        
        if (!tronWeb.isAddress(account)) {
            throw new Error('发送地址格式无效');
        }
        
        if (!tronWeb.isAddress(contractAddr)) {
            throw new Error('合约地址格式无效');
        }
        
        if (!tronWeb.isAddress(recipientAddr)) {
            throw new Error('接收地址格式无效');
        }
        
        const amountNum = parseFloat(transferAmount);
        if (isNaN(amountNum) || amountNum <= 0) {
            throw new Error('转账金额必须大于0');
        }
        
        if (account === recipientAddr) {
            throw new Error('发送地址和接收地址不能相同');
        }
    };

    // TRC-10 合约交易 - signTransaction 方法
    const signTrc10Transaction = async (): Promise<void> => {
        if (!account || !contractAddress || !recipient || !amount) {
            alert('请填写完整信息');
            return;
        }

        try {
            setLoading(true);

            if (!binanceW3W?.tron) {
                throw new Error('钱包未连接');
            }

            // 验证参数
            validateTrc10Params(contractAddress, recipient, amount);

            // 构建交易
            const transaction = await buildTrc10Transaction(contractAddress, recipient, amount, decimals);
            console.log('TRC-10 合约交易构建完成:', transaction);

            // 使用钱包签名交易
            const signedTx = await binanceW3W.tron.signTransaction(transaction);
            console.log('TRC-10 合约交易签名完成:', signedTx);
            
            // 手动广播交易
            const broadcastResult = await tronWeb.trx.sendRawTransaction(signedTx);
            console.log('TRC-10 合约广播结果:', broadcastResult);
            
            const result: Trc10TransferResult = {
                originalTransaction: transaction,
                signedTransaction: signedTx,
                broadcastResult: broadcastResult,
                txid: broadcastResult.txid || broadcastResult.transaction?.txID,
                success: broadcastResult.result || false,
                signedAt: new Date().toISOString(),
                address: account,
                method: 'signTransaction',
                tokenId: contractAddress,
                tokenInfo: smartContractTokens.find(t => t.address === contractAddress)?.name || 'Unknown Token'
            };
            
            setTrc10TransferData(JSON.stringify(result, null, 2));
            
            if (broadcastResult.result) {
                alert(`TRC-10 合约交易成功！\n交易ID: ${broadcastResult.txid || broadcastResult.transaction?.txID}`);
                // 更新余额
                await onBalanceUpdate(account);
            } else {
                alert('TRC-10 合约交易失败: ' + (broadcastResult.message || '未知错误'));
            }
            
        } catch (error) {
            console.error('TRC-10 合约交易失败:', error);
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            alert('TRC-10 合约交易失败: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // TRC-10 合约交易 - signAndSendTransaction 方法
    const signAndSendTrc10Transaction = async (): Promise<void> => {
        if (!account || !contractAddress || !recipient || !amount) {
            alert('请填写完整信息');
            return;
        }

        try {
            setLoading(true);

            if (!binanceW3W?.tron) {
                throw new Error('钱包未连接');
            }

            // 验证参数
            validateTrc10Params(contractAddress, recipient, amount);

            // 构建交易
            const transaction = await buildTrc10Transaction(contractAddress, recipient, amount, decimals);
            console.log('TRC-10 合约交易构建完成:', transaction);

            // 使用钱包签名并发送交易
            const result = await binanceW3W.tron.signAndSendTransaction(transaction);
            console.log('TRC-10 合约签名并发送结果:', result);
            
            const contractResult: Trc10TransferResult = {
                originalTransaction: transaction,
                signedTransaction: result,
                broadcastResult: result,
                txid: result.txid,
                success: result.result || false,
                signedAt: new Date().toISOString(),
                address: account,
                method: 'signAndSendTransaction',
                tokenId: contractAddress,
                tokenInfo: smartContractTokens.find(t => t.address === contractAddress)?.name || 'Unknown Token'
            };
            
            setTrc10TransferData(JSON.stringify(contractResult, null, 2));

            if (result.result) {
                alert(`TRC-10 合约交易成功！\n交易ID: ${result.txid}`);
                // 更新余额
                await onBalanceUpdate(account);
            } else {
                alert('TRC-10 合约交易失败');
            }
        } catch (error) {
            console.error('TRC-10 合约交易失败:', error);
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            alert('TRC-10 合约交易失败: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleContractAddressChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setContractAddress(e.target.value);
    };

    const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setRecipient(e.target.value);
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setAmount(e.target.value);
    };

    const handleDecimalsChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setDecimals(e.target.value);
    };

    return (
        <div>
            {/* TRC-10 智能合约交易表单 */}
            <div style={{
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <h3>智能合约代币转账</h3>
                <p style={{fontSize: '14px', color: '#666', marginBottom: '15px'}}>
                    通过智能合约调用 transfer 函数进行代币转账 (triggerSmartContract) - 支持 TRC-20 和带有智能合约功能的 TRC-10 代币
                </p>

                <div style={{marginBottom: '15px'}}>
                    <label>合约地址 (Contract Address):</label>
                    <select
                        value={contractAddress}
                        onChange={(e) => {
                            setContractAddress(e.target.value);
                            const token = smartContractTokens.find(t => t.address === e.target.value);
                            if (token) {
                                setDecimals(token.decimals.toString());
                            }
                        }}
                        style={{
                            width: '100%',
                            padding: '8px',
                            marginTop: '5px',
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                        }}
                    >
                        {smartContractTokens.map(token => (
                            <option key={token.address} value={token.address}>
                                {token.address} - {token.name} ({token.symbol})
                            </option>
                        ))}
                    </select>
                    <input
                        type="text"
                        value={contractAddress}
                        onChange={handleContractAddressChange}
                        placeholder="或手动输入智能合约地址"
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
                <div style={{marginBottom: '15px', display: 'flex', gap: '10px'}}>
                    <div style={{flex: 2}}>
                        <label>金额:</label>
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
                    <div style={{flex: 1}}>
                        <label>精度 (decimals):</label>
                        <input
                            type="number"
                            value={decimals}
                            onChange={handleDecimalsChange}
                            placeholder="精度"
                            min="0"
                            max="18"
                            style={{
                                width: '100%',
                                padding: '8px',
                                marginTop: '5px',
                                borderRadius: '4px',
                                border: '1px solid #ddd'
                            }}
                        />
                    </div>
                </div>

                <div style={{display: 'flex', gap: '10px'}}>
                    <button
                        onClick={signTrc10Transaction}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '10px',
                            backgroundColor: '#9b59b6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? '处理中...' : '智能合约 signTransaction'}
                    </button>
                    <button
                        onClick={signAndSendTrc10Transaction}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '10px',
                            backgroundColor: '#8e44ad',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? '处理中...' : '智能合约 signAndSendTransaction'}
                    </button>
                </div>
            </div>

            {/* TRC-10 合约交易结果显示 */}
            {trc10TransferData && (
                <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <h3>智能合约代币交易结果</h3>
                    <pre style={{
                        backgroundColor: '#e9ecef',
                        padding: '10px',
                        borderRadius: '4px',
                        overflow: 'auto',
                        fontSize: '12px'
                    }}>
                        {trc10TransferData}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default Trc10ContractComponent; 