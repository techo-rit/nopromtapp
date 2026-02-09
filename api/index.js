let handler;

module.exports = async (req, res) => {
  if (!handler) {
    const [{ default: serverless }, { createApp }] = await Promise.all([
      import('serverless-http'),
      import('../server/src/app.js'),
    ]);
    handler = serverless(createApp());
  }
  return handler(req, res);
};
