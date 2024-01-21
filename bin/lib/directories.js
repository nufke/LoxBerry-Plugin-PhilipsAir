const directories = () => {
  // TODO: replace paths by environment variables
  return {
    config: '/opt/loxberry/config/plugins/philipsair',
    logdir: '/opt/loxberry/log/plugins/philipsair',
    homedir: '/opt/loxberry',
    system_data: '/opt/loxberry/data/system',
    system_config: '/opt/loxberry/config/system',
    syslogdir: '/opt/loxberry/log/system_tmpfs',
  };
};

module.exports = directories();
