// Установка плагинов отключена для локальной версии

export default async function installPlugin(pluginName: string): Promise<void> {
  throw new Error('Plugin installation disabled in local version. Plugin name: ' + pluginName);
}

export const installPluginFromUrl = async () => {
  throw new Error('Plugin installation from URL disabled in local version');
}; 
