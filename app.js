/**
 * API调用工具的主要JavaScript文件
 * @author 您的名字
 * @version 1.0.0
 */

document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const tabMaterial = document.getElementById('tab-material');
    const tabContent = document.getElementById('tab-content');
    const panelMaterial = document.getElementById('panel-material');
    const panelContent = document.getElementById('panel-content');
    
    const materialInput = document.getElementById('material-input');
    const searchCount = document.getElementById('search-count');
    const materialSubmit = document.getElementById('material-submit');
    const materialOutput = document.getElementById('material-output');
    const materialStatus = document.getElementById('material-status');
    
    const contentInput = document.getElementById('content-input');
    const contentSubmit = document.getElementById('content-submit');
    const contentOutput = document.getElementById('content-output');
    const contentStatus = document.getElementById('content-status');
    
    // 添加复制按钮元素
    const materialCopyBtn = document.getElementById('material-copy');
    const contentCopyBtn = document.getElementById('content-copy');
    
    // 选项卡切换功能
    tabMaterial.addEventListener('click', () => {
        panelMaterial.classList.remove('hidden');
        panelContent.classList.add('hidden');
        tabMaterial.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        tabMaterial.classList.remove('text-gray-500');
        tabContent.classList.add('text-gray-500');
        tabContent.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
    });
    
    tabContent.addEventListener('click', () => {
        panelMaterial.classList.add('hidden');
        panelContent.classList.remove('hidden');
        tabContent.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        tabContent.classList.remove('text-gray-500');
        tabMaterial.classList.add('text-gray-500');
        tabMaterial.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
    });
    
    /**
     * 发送请求到资料整理API
     * @param {string} input - 用户输入的文本
     * @param {number} count - 搜索数量
     * @returns {Promise<string>} API响应结果
     */
    async function callMaterialAPI(input, count) {
        try {
            // 显示加载指示器
            materialOutput.innerHTML = '<div class="flex justify-center items-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div><span class="ml-2">正在请求中...</span></div>';
            
            // 使用存储的WorkflowID或默认值
            const workflowId = getWorkflowID() || "7480435490237726757";
            
            const response = await fetch('https://api.coze.cn/v1/workflow/run', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + getAPIKey(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "workflow_id": workflowId,
                    "parameters": {
                        "input": String(input),
                        "search_Count": Number(count)
                    },
                    "app_id": getAppId()
                })
            });
            
            // 获取响应文本
            const responseText = await response.text();
            let responseData;
            let tokenUsage = "";
            
            try {
                // 尝试解析JSON
                responseData = JSON.parse(responseText);
                
                // 检查是否有错误码
                if (responseData.code !== undefined && responseData.code !== 0) {
                    throw new Error(`API请求失败: 错误码 ${responseData.code}, ${responseData.msg || '未知错误'}`);
                }
                
                // 尝试获取token使用信息
                tokenUsage = getTokenUsageInfo(responseData);
                
                // 显示成功消息和token使用情况
                materialOutput.textContent = `返回成功${tokenUsage}`;
                getAPIUsageInfo().then(usageInfo => {
                    if (usageInfo) {
                        materialOutput.textContent += usageInfo;
                    }
                });
                materialStatus.textContent = '输出结束';
                setTimeout(() => {
                    materialStatus.classList.add('hidden');
                }, 3000);
                
                return `返回成功${tokenUsage}`;
                
            } catch (jsonError) {
                // 如果不是JSON或解析失败，继续处理原始文本
                if (!response.ok) {
                    throw new Error(`API请求失败: 状态码 ${response.status}`);
                }
                
                // 处理流式响应
                const stream = new ReadableStream({
                    start(controller) {
                        controller.enqueue(new TextEncoder().encode(responseText));
                        controller.close();
                    }
                });
                
                // 创建一个新的Response对象
                const streamResponse = new Response(stream);
                
                // 处理流式响应
                const reader = streamResponse.body.getReader();
                let decoder = new TextDecoder();
                let result = '';
                
                materialStatus.textContent = '正在输出中...';
                materialStatus.classList.remove('hidden');
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    let chunk = decoder.decode(value, { stream: true });
                    result += chunk;
                    materialOutput.textContent = result;
                }
                
                // 可能的流响应结束标记可能包含token信息
                if (result.includes("token") || result.includes("Token")) {
                    const lines = result.split('\n');
                    for (const line of lines) {
                        if (line.includes("token") || line.includes("Token")) {
                            tokenUsage = `\n${line.trim()}`;
                            break;
                        }
                    }
                }
                
                // 更新为成功消息和token使用情况
                materialOutput.textContent = `返回成功${tokenUsage}`;
                getAPIUsageInfo().then(usageInfo => {
                    if (usageInfo) {
                        materialOutput.textContent += usageInfo;
                    }
                });
                materialStatus.textContent = '输出结束';
                setTimeout(() => {
                    materialStatus.classList.add('hidden');
                }, 3000);
                
                return `返回成功${tokenUsage}`;
            }
            
        } catch (error) {
            console.error('调用资料整理API出错:', error);
            materialOutput.textContent = '请求出错: ' + error.message;
            materialStatus.textContent = '请求失败';
            materialStatus.classList.remove('hidden');
            return '请求出错: ' + error.message;
        }
    }
    
    /**
     * 发送请求到文案生成API
     * @param {string} input - 用户输入的文本
     * @returns {Promise<string>} API响应结果
     */
    async function callContentAPI(input) {
        try {
            // 显示加载指示器
            contentOutput.innerHTML = '<div class="flex justify-center items-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div><span class="ml-2">正在请求中...</span></div>';
            
            // 使用存储的第二个WorkflowID或默认值
            const workflowId = getContentWorkflowID() || "7480439825122132020";
            
            const response = await fetch('https://api.coze.cn/v1/workflow/run', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + getAPIKey(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "workflow_id": workflowId,
                    "parameters": {
                        "input": String(input)
                    },
                    "app_id": getAppId()
                })
            });
            
            // 获取响应文本
            const responseText = await response.text();
            let responseData;
            let tokenUsage = "";
            
            try {
                // 尝试解析JSON
                responseData = JSON.parse(responseText);
                
                // 检查是否有错误码
                if (responseData.code !== undefined && responseData.code !== 0) {
                    throw new Error(`API请求失败: 错误码 ${responseData.code}, ${responseData.msg || '未知错误'}`);
                }
                
                // 尝试获取token使用信息
                tokenUsage = getTokenUsageInfo(responseData);
                
                // 显示成功消息和token使用情况
                contentOutput.textContent = `返回成功${tokenUsage}`;
                getAPIUsageInfo().then(usageInfo => {
                    if (usageInfo) {
                        contentOutput.textContent += usageInfo;
                    }
                });
                contentStatus.textContent = '输出结束';
                setTimeout(() => {
                    contentStatus.classList.add('hidden');
                }, 3000);
                
                return `返回成功${tokenUsage}`;
                
            } catch (jsonError) {
                // 如果不是JSON或解析失败，继续处理原始文本
                if (!response.ok) {
                    throw new Error(`API请求失败: 状态码 ${response.status}`);
                }
                
                // 处理流式响应
                const stream = new ReadableStream({
                    start(controller) {
                        controller.enqueue(new TextEncoder().encode(responseText));
                        controller.close();
                    }
                });
                
                // 创建一个新的Response对象
                const streamResponse = new Response(stream);
                
                // 处理流式响应
                const reader = streamResponse.body.getReader();
                let decoder = new TextDecoder();
                let result = '';
                
                contentStatus.textContent = '正在输出中...';
                contentStatus.classList.remove('hidden');
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    let chunk = decoder.decode(value, { stream: true });
                    result += chunk;
                    contentOutput.textContent = result;
                }
                
                // 可能的流响应结束标记可能包含token信息
                if (result.includes("token") || result.includes("Token")) {
                    const lines = result.split('\n');
                    for (const line of lines) {
                        if (line.includes("token") || line.includes("Token")) {
                            tokenUsage = `\n${line.trim()}`;
                            break;
                        }
                    }
                }
                
                // 更新为成功消息和token使用情况
                contentOutput.textContent = `返回成功${tokenUsage}`;
                getAPIUsageInfo().then(usageInfo => {
                    if (usageInfo) {
                        contentOutput.textContent += usageInfo;
                    }
                });
                contentStatus.textContent = '输出结束';
                setTimeout(() => {
                    contentStatus.classList.add('hidden');
                }, 3000);
                
                return `返回成功${tokenUsage}`;
            }
            
        } catch (error) {
            console.error('调用文案生成API出错:', error);
            contentOutput.textContent = '请求出错: ' + error.message;
            contentStatus.textContent = '请求失败';
            contentStatus.classList.remove('hidden');
            return '请求出错: ' + error.message;
        }
    }
    
    /**
     * 获取API密钥，实际应用中应从配置或安全存储中获取
     * @returns {string} API密钥
     */
    function getAPIKey() {
        // 实际应用中，不应将API密钥硬编码在前端代码中
        // 这里仅作为示例，应通过后端服务安全处理
        return localStorage.getItem('api_key') || '';
    }
    
    /**
     * 获取资料整理的WorkflowID
     * @returns {string} WorkflowID
     */
    function getWorkflowID() {
        return localStorage.getItem('material_workflow_id') || '';
    }
    
    /**
     * 获取文案生成的WorkflowID
     * @returns {string} WorkflowID
     */
    function getContentWorkflowID() {
        return localStorage.getItem('content_workflow_id') || '';
    }
    
    /**
     * 获取App ID，实际应用中应从配置或安全存储中获取
     * @returns {string} App ID
     */
    function getAppId() {
        // 同上，不应硬编码
        return localStorage.getItem('app_id') || '';
    }
    
    /**
     * 设置API配置信息
     */
    function setupAPIConfig() {
        const apiKey = document.getElementById('api-key');
        const appId = document.getElementById('app-id');
        const materialWorkflowId = document.getElementById('material-workflow-id');
        const contentWorkflowId = document.getElementById('content-workflow-id');
        const saveConfigBtn = document.getElementById('save-config');
        
        // 初始化显示已保存的配置
        if (apiKey && appId) {
            apiKey.value = getAPIKey() || '';
            appId.value = getAppId() || '';
        }
        
        if (materialWorkflowId) {
            materialWorkflowId.value = getWorkflowID() || '';
        }
        
        if (contentWorkflowId) {
            contentWorkflowId.value = getContentWorkflowID() || '';
        }
        
        // 保存按钮事件
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => {
                if (apiKey && appId) {
                    if (apiKey.value.trim() && appId.value.trim()) {
                        localStorage.setItem('api_key', apiKey.value.trim());
                        localStorage.setItem('app_id', appId.value.trim());
                        
                        // 保存WorkflowID (允许为空，此时将使用默认值)
                        if (materialWorkflowId) {
                            localStorage.setItem('material_workflow_id', materialWorkflowId.value.trim());
                        }
                        
                        if (contentWorkflowId) {
                            localStorage.setItem('content_workflow_id', contentWorkflowId.value.trim());
                        }
                        
                        alert('API配置已保存');
                        
                        // 关闭配置模态框
                        const configModal = document.getElementById('config-modal');
                        if (configModal) {
                            configModal.classList.add('hidden');
                        }
                    } else {
                        alert('API密钥和App ID不能为空');
                    }
                }
            });
        }
    }
    
    // 检查API密钥和App ID是否已设置
    function checkAPISettings() {
        if (!getAPIKey() || !getAppId()) {
            // 显示配置面板或打开配置模态框
            const configModal = document.getElementById('config-modal');
            if (configModal) {
                configModal.classList.remove('hidden');
                return false;
            } else {
                // 如果未设置UI，则回退到提示框
                const apiKey = prompt('请输入API密钥 (Bearer Token):');
                const appId = prompt('请输入App ID:');
                
                if (apiKey) localStorage.setItem('api_key', apiKey);
                if (appId) localStorage.setItem('app_id', appId);
                
                if (!apiKey || !appId) {
                    alert('API密钥和App ID必须设置才能使用应用');
                    return false;
                }
            }
        }
        return true;
    }
    
    /**
     * 添加重试功能的API调用
     * @param {Function} apiCall - API调用函数
     * @param {number} retries - 重试次数
     * @returns {Promise<any>} API响应结果
     */
    async function callWithRetry(apiCall, retries = 3) {
        let lastError;
        
        for (let i = 0; i < retries; i++) {
            try {
                return await apiCall();
            } catch (error) {
                console.error(`尝试 ${i+1}/${retries} 失败:`, error);
                lastError = error;
                // 等待一段时间再重试
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
        
        throw lastError;
    }
    
    // 绑定提交事件
    materialSubmit.addEventListener('click', async () => {
        if (!checkAPISettings()) return;
        
        const input = materialInput.value.trim();
        const count = parseInt(searchCount.value);
        
        if (!input) {
            alert('请输入内容');
            return;
        }
        
        if (isNaN(count) || count < 1) {
            alert('请输入有效的搜索数量');
            return;
        }
        
        materialOutput.textContent = '处理中...';
        try {
            await callWithRetry(() => callMaterialAPI(input, count));
        } catch (error) {
            materialOutput.textContent = '请求失败，请稍后重试: ' + error.message;
            materialStatus.textContent = '请求失败';
            materialStatus.classList.remove('hidden');
        }
    });
    
    contentSubmit.addEventListener('click', async () => {
        if (!checkAPISettings()) return;
        
        const input = contentInput.value.trim();
        
        if (!input) {
            alert('请输入内容');
            return;
        }
        
        contentOutput.textContent = '处理中...';
        await callContentAPI(input);
    });
    
    // 添加复制功能
    /**
     * 复制文本到剪贴板
     * @param {string} text - 要复制的文本
     * @param {HTMLElement} statusElement - 状态显示元素
     */
    function copyToClipboard(text, statusElement) {
        navigator.clipboard.writeText(text).then(() => {
            statusElement.textContent = '复制成功!';
            statusElement.classList.remove('hidden');
            setTimeout(() => {
                statusElement.classList.add('hidden');
            }, 2000);
        }).catch(err => {
            statusElement.textContent = '复制失败: ' + err;
            statusElement.classList.remove('hidden');
        });
    }
    
    // 绑定复制按钮事件
    if (materialCopyBtn) {
        materialCopyBtn.addEventListener('click', () => {
            copyToClipboard(materialOutput.textContent, materialStatus);
        });
    }
    
    if (contentCopyBtn) {
        contentCopyBtn.addEventListener('click', () => {
            copyToClipboard(contentOutput.textContent, contentStatus);
        });
    }
    
    // 初始设置
    checkAPISettings();
    setupAPIConfig();
});

/**
 * 处理API响应并获取token消耗信息
 * @param {Object} responseData - API响应数据
 * @returns {string} token消耗信息字符串
 */
function getTokenUsageInfo(responseData) {
    // 检查标准路径
    if (responseData && responseData.data && responseData.data.token_usage) {
        const usage = responseData.data.token_usage;
        return `\n消耗Token: ${usage.total_tokens || 0}`;
    }
    
    // 尝试查找token信息
    if (responseData && responseData.data && responseData.data.token) {
        return `\n消耗Token: ${responseData.data.token}`;
    }
    
    // 如果存在completion_tokens字段
    if (responseData && responseData.completion_tokens) {
        return `\n消耗Token: ${responseData.completion_tokens}`;
    }
    
    // 检查消息字段中的token信息
    if (responseData && responseData.msg && responseData.msg.includes("token")) {
        return `\n${responseData.msg}`;
    }
    
    // 由于API返回可能不包含token信息，返回空字符串或固定信息
    return "\n注意: API响应中未包含Token消耗信息";
}

/**
 * 获取API使用情况信息
 * @returns {Promise<string>} 使用情况信息字符串
 */
async function getAPIUsageInfo() {
    try {
        const response = await fetch('https://api.coze.cn/v1/usage', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + getAPIKey(),
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            return "";
        }
        
        const data = await response.json();
        if (data && data.data && data.data.token_used) {
            return `\n今日已使用Token: ${data.data.token_used}`;
        }
        
        return "";
    } catch (error) {
        console.error("获取使用情况出错:", error);
        return "";
    }
} 