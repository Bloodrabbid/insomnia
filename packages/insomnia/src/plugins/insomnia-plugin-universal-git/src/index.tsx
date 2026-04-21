import { Gitlab } from './gitProviders/gitlab';
import { UserConfig } from './interfaces/UserConfig';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import { createRoot } from 'react-dom/client';

async function loadConfig(context): Promise<UserConfig | null> {
    const storedConfig = await context.store.getItem('gitlab-sync:config');
    try {
        return JSON.parse(storedConfig);
    } catch(e) {
        console.error("Loading config failed: ", e);
        return null;
    }
}

async function storeConfig(context, userConfig: UserConfig) {
    await context.store.setItem('gitlab-sync:config', JSON.stringify(userConfig));
}
function GitlabConfigForm({ context }) {
    const [url, setUrl] = React.useState('');
    const [token, setToken] = React.useState('');
    const [projectId, setProjectId] = React.useState('');
    const [branch, setBranch] = React.useState('main');
    const [configFileName, setConfigFileName] = React.useState('insomnia-sync.yaml');
    const [clearBeforeImport, setClearBeforeImport] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        async function load() {
            try {
                // Старая конфигурация могла храниться в gitlab-sync:config
                const storedConfig = await context.store.getItem('gitlab-sync:config');
                if (storedConfig) {
                    const parsed = JSON.parse(storedConfig);
                    if (parsed.baseUrl) setUrl(parsed.baseUrl);
                    if (parsed.token) setToken(parsed.token);
                    if (parsed.projectId) setProjectId(parsed.projectId);
                    if (parsed.branch) setBranch(parsed.branch);
                    if (parsed.configFileName) setConfigFileName(parsed.configFileName);
                }
                
                // Новые поля
                const savedClear = await context.store.getItem('gitlab_clear_before_import');
                if (savedClear === 'true') setClearBeforeImport(true);
            } catch (e) {
                console.error('Plugin: Error loading config:', e);
            }
            setLoading(false);
        }
        load();
    }, []);

    const save = async () => {
        const config = { baseUrl: url, token, projectId, branch, configFileName };
        await context.store.setItem('gitlab-sync:config', JSON.stringify(config));
        await context.store.setItem('gitlab_clear_before_import', String(clearBeforeImport));
        await context.app.alert('Saved!', 'GitLab configuration updated.');
    };

    if (loading) return <div className="pad">Loading settings...</div>;

    return (
        <div className="pad" style={{ minWidth: '450px' }}>
            <div className="form-control form-control--outlined">
                <label>
                    GitLab URL:
                    <input type="text" placeholder="https://gitlab.example.com" value={url} onChange={e => setUrl(e.target.value)} />
                </label>
                <label>
                    Access Token:
                    <input type="text" placeholder="your-token" value={token} onChange={e => setToken(e.target.value)} />
                </label>
                <label>
                    Project ID:
                    <input type="text" placeholder="123" value={projectId} onChange={e => setProjectId(e.target.value)} />
                </label>
                <label>
                    Branch:
                    <input type="text" placeholder="main" value={branch} onChange={e => setBranch(e.target.value)} />
                </label>
                <label>
                    Workspace File Name (in repo):
                    <input type="text" placeholder="insomnia-sync.yaml" value={configFileName} onChange={e => setConfigFileName(e.target.value)} />
                </label>
            </div>
            
            <div className="form-control form-control--outlined" style={{ marginTop: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input 
                        type="checkbox" 
                        checked={clearBeforeImport} 
                        onChange={e => setClearBeforeImport(e.target.checked)} 
                        style={{ width: 'auto' }}
                    />
                    <span>Clear workspace before import (Delete all requests/folders first)</span>
                </label>
            </div>

            <div className="margin-top">
                <button className="btn btn--clicky" onClick={save}>Save Configuration</button>
            </div>
        </div>
    );
}

async function pushWorkspace(context, models) {
    try {
        console.log('Plugin: Starting Push Workspace (Version Fix Applied)...');
        const config: UserConfig = await loadConfig(context);

        var commitMessage = await context.app.prompt(
            'GitLab - Push Workspace - Commit Message', {
                label: 'Commit Message',
                defaultValue: 'Update workspace',
                submitName: 'Commit',
                cancelable: true,
            }
        );

        let workspaceData = await context.data.export.insomnia({
            includePrivate: false,
            format: 'json',
            workspace: models.workspace
        });

        const gitlabProvider = new Gitlab(config);
        
        let parsedData;
        if (typeof workspaceData === 'string') {
            parsedData = JSON.parse(workspaceData);
        } else if (Array.isArray(workspaceData)) {
            parsedData = workspaceData[0];
        } else {
            parsedData = workspaceData;
        }

        let contentToPush = typeof parsedData === 'string' 
            ? parsedData 
            : JSON.stringify(parsedData, null, 2);

        gitlabProvider.pushWorkspace(
            contentToPush,
            commitMessage
        );

        await context.app.alert('Success!', 'Your workspace config was successfully pushed.');
    } catch (e) {
        console.error(e);
        await context.app.alert('Error!', 'Something went wrong. Please try pushing again and check your setup.');
    }
}

async function pullWorkspace(context) {
    try {
        console.log('Plugin: Starting Pull...');
        const config: UserConfig = await loadConfig(context);
        const gitlabProvider = new Gitlab(config);

        const workspace = await gitlabProvider.pullWorkspace();
        console.log('Plugin: Raw data from GitLab:', workspace);
        
        if (!workspace) {
            throw new Error('GitLab returned nothing (null/empty).');
        }

        let contentStr = typeof workspace === 'string' ? workspace : JSON.stringify(workspace);
        
        // Если почему-то пришла строка "null", это ошибка
        if (contentStr === 'null' || contentStr === '""') {
            throw new Error('Workspace data is null or empty string');
        }

        const shouldClear = await context.store.getItem('gitlab_clear_before_import') === 'true';

        console.log('Plugin: Attempting to import into current workspace:', contentStr.length);
        
        // Используем наш новый метод (мы пропатчили ядро Insomnia выше)
        if (context.data.import.toCurrentWorkspace) {
            if (shouldClear && context.data.import.clearWorkspace) {
                console.log('Plugin: Clearing workspace before import...');
                await context.data.import.clearWorkspace('wrk_scratchpad');
            }
            await context.data.import.toCurrentWorkspace(contentStr, 'wrk_scratchpad');
        } else {
            await context.data.import.raw(contentStr);
        }
        
        console.log('Plugin: Import finished');
        
        // Автоматически перезагружаем окно через полсекунды, чтобы пользователь успел увидеть успех
        setTimeout(() => {
            window.location.reload();
        }, 500);

        await context.app.alert('Success!', 'Pull finished. The window will now reload to show changes.');
    } catch(e) {
        console.error('Plugin: Pull Error:', e);
        await context.app.alert('Error!', `Pull failed: ${e.message || e}`);
    }
}

const workspaceActions = [
    {
        label: 'GitLab - Setup',
        action(context, models) {
            const root = document.createElement('div');
            const reactRoot = createRoot(root);
            reactRoot.render(<GitlabConfigForm context={context}/>);

            context.app.dialog('GitLab - Setup', root, {
                skinny: true,
                onHide() {
                    reactRoot.unmount();
                },
            });
        }
    },
    {
        label: 'GitLab - Pull Workspace',
        action: async(context) => {
            await pullWorkspace(context);
        },
    },
    {
        label: 'GitLab - Push Workspace',
        action: async(context, models) => {
            await pushWorkspace(context, models);
        },
    },
    {
        label: 'Generate RTCM Structure',
        action: async (context, models) => {
            const { workspace } = models;
            
            const structure = {
                type: 'collection.insomnia.rest/5.0',
                name: 'Scratch Pad',
                meta: { id: workspace._id },
                collection: [
                    {
                        name: 'PROD',
                        meta: { id: 'fld_prod' },
                        children: [
                            {
                                name: 'RTCM',
                                meta: { id: 'fld_rtcm' },
                                children: [
                                    {
                                        name: 'Backends',
                                        meta: { id: 'fld_backends' },
                                        children: [
                                            {
                                                name: 'cache',
                                                meta: { id: 'fld_cache' },
                                                children: [
                                                    { 
                                                        name: '/cache - get all caches', 
                                                        meta: { id: 'req_cache_get' },
                                                        method: 'GET', 
                                                        url: '{{base_url}}/cache',
                                                        settings: { renderRequestBody: true, encodeUrl: true, followRedirects: 'global', cookies: { send: true, store: true }, rebuildPath: true }
                                                    },
                                                    { 
                                                        name: '!!!! delete caches2 !!!!', 
                                                        meta: { id: 'req_cache_del' },
                                                        method: 'DELETE', 
                                                        url: '{{base_url}}/cache',
                                                        settings: { renderRequestBody: true, encodeUrl: true, followRedirects: 'global', cookies: { send: true, store: true }, rebuildPath: true }
                                                    }
                                                ]
                                            },
                                            { name: 'promocodes', meta: { id: 'fld_promo' }, children: [] }
                                        ]
                                    },
                                    { name: 'Usercaches', meta: { id: 'fld_user' }, children: [] },
                                    { name: 'Cache loader', meta: { id: 'fld_loader' }, children: [] },
                                    { name: 'BRE', meta: { id: 'fld_bre' }, children: [] }
                                ]
                            }
                        ]
                    }
                ]
            };

            try {
                console.log('Plugin: Generating CORRECT V5 structure via toCurrentWorkspace...');
                const content = JSON.stringify(structure);
                const shouldClear = await context.store.getItem('gitlab_clear_before_import') === 'true';

                if (context.data.import.toCurrentWorkspace) {
                    if (shouldClear && context.data.import.clearWorkspace) {
                        console.log('Plugin: Clearing workspace before structure generation...');
                        await context.data.import.clearWorkspace(workspace._id);
                    }
                    await context.data.import.toCurrentWorkspace(content, workspace._id);
                } else {
                    await context.data.import.raw(content);
                }
                console.log('Plugin: V5 structure import finished');
                
                // Автоматически перезагружаем окно
                setTimeout(() => {
                    window.location.reload();
                }, 500);

                await context.app.alert('Success!', 'Structure generated correctly. The window will now reload.');
            } catch (e) {
                console.error('Plugin: V5 Structure Gen Error:', e);
                await context.app.alert('Error!', e.message);
            }
        }
    }
];

const requestActions = [
    {
        label: 'GitLab Sync - Setup',
        action(context) {
            const root = document.createElement('div');
            const reactRoot = createRoot(root);
            reactRoot.render(<GitlabConfigForm context={context}/>);

            context.app.dialog('GitLab - Setup', root, {
                skinny: true,
                onHide() {
                    reactRoot.unmount();
                },
            });
        }
    },
    {
        label: 'GitLab Sync - Push Scratch Pad',
        action: async (context) => {
            // В requestActions нет доступа к context.util.models, 
            // поэтому передаем "заглушку" с ID Scratch Pad, этого достаточно для экспорта
            const workspace = { _id: 'wrk_scratchpad' };
            await pushWorkspace(context, { workspace });
        },
    },
    {
        label: 'GitLab Sync - Pull Scratch Pad',
        action: async (context) => {
            await pullWorkspace(context);
        },
    }
];

export { workspaceActions, requestActions }