const express = require('express');
const router = express.Router();
const { getRules, createRule, updateRule, deleteRule, validateRule, reorderRules } = require('../controllers/ruleController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.route('/steps/:step_id/rules').get(getRules).post(createRule);
router.put('/steps/:step_id/rules/reorder', reorderRules);
router.route('/rules/:id').put(updateRule).delete(deleteRule);
router.post('/rules/validate', validateRule);

module.exports = router;
