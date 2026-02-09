let handler;

module.exports = async (req, res) => {
  if (!handler) {
    const { createApp } = await import('../server/src/app.js');
    const app = createApp();
    handler = (req, res) => app(req, res);
  }
  return handler(req, res);
};
