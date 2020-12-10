const express = require('express');
const { body } = require('express-validator/check');

const User = require('../models/user');
const authController = require('../controllers/auth');
const isAuth = require('../middleware/isAuth');

const router = express.Router();

router.put(
  '/signup',
  [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email.')
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then(userDoc => {
          if (userDoc) {
            return Promise.reject('E-Mail address already exists!');
          }
        });
      })
      .normalizeEmail(),
    body('password')
      .trim()
      .isLength({ min: 5 }),
    body('name')
      .trim()
      .not()
      .isEmpty()
  ],
  authController.signup
);

//validate the above input fields during a PUT request to /signup, if they fail- trigger error reponse. If they succeed, move on to the controller 

router.post('/login', authController.login);

router.get('/status', isAuth, authController.getStatus);

router.put(
  '/status',
  isAuth,
  [
    body('status')
      .trim()
      .not()
      .isEmpty()
  ],
  authController.putStatus
);

module.exports = router;
