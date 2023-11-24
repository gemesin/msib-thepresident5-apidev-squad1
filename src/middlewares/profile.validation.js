const { body } = require('express-validator');
const { userModel } = require('../models');

const validationProfile = [
  body('nama')
    .trim()
    .optional({ nullable: true, checkFalsy: true })
    .notEmpty()
    .withMessage('Username tidak boleh kosong'),
  body('email')
    .isEmail().withMessage('Format email harus benar')
    .custom(async (email, { req }) => {
      const existingUser = await userModel.findOne({
          where: {
              email: email
          }
      });
      if (existingUser) {
          throw new Error("Email sudah digunakan");
      }
    })
    .bail() 
    .optional({ nullable: true, checkFalsy: true }), 

  // body('oldPassword').trim().notEmpty().withMessage('Password lama tidak boleh kosong'),
  // body('newPassword')
  //   .trim()
  //   .notEmpty().withMessage('Password baru tidak boleh kosong')
  //   .isLength({ min: 8 }).withMessage('Password baru harus minimal 8 karakter')
  //   .matches(/[\W_]/).withMessage('Password baru harus mengandung minimal 1 simbol'),
  // body('confirmPassword').custom((value, { req }) => {
  //   if (value !== req.body.newPassword) {
  //     throw new Error('Konfirmasi password baru tidak sesuai');
  //   }
  //   return true;
  // }),
];

module.exports = { validationProfile };