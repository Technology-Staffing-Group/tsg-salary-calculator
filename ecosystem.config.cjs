module.exports = {
  apps: [
    {
      name: 'tsg-api',
      script: 'node',
      args: 'dist/index.js',
      cwd: '/home/user/webapp/server',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    }
  ]
};
