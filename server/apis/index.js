const router = require('express').Router();
const healthcheck = require('./healthcheck');
const optins = require('./opt_ins');
const proactive = require('./proactive');
const notifications = require('./push_notifications');

router.use('/api/healthcheck', healthcheck);
router.use('/api/optins', optins);
router.use('/api/proactive', proactive);
router.use('/api/notifications', notifications);

router.use((req, res, next) => {
    const err = new Error("API route not found!");
    err.status = 404;
    return err;
  });

module.exports = router;