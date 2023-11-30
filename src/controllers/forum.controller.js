const express = require('express');
const { forumModel, commentModel, userModel, likesModel } = require('../models/');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const passport = require('passport');
const { forumValidation } = require('../middlewares/forum.validation');
const { commentValidation } = require('../middlewares/comment.validation');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const lmsModel = require('../models/lms.model');

const router = express.Router();

router.use(passport.authenticate('jwt', { session: false }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destinationPath = path.resolve(__dirname, '..', 'covers_forum');
    cb(null, destinationPath);
  },
  filename: (req, file, cb) => {
    cb(null, "forum" + Date.now() + '-cover' + path.extname(file.originalname));
  }
});

const multerFilter = (req, file, cb) => {
  let ext = path.extname(file.originalname);
  if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
    req.fileValidationError = "Foto hanya bisa png, jpg atau jpeg";
    return cb(null, false, req.fileValidationError);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: multerFilter
});

const uploadCover = upload.single('cover');

router.get('/forum', async (req, res) => {
  try {
    const userId = req.user.id;

    const getAllPost = await forumModel.findAll({
      include: [
        {
          model: likesModel,
          as: 'likes',
          where: {
            id_user: userId
          },
          attributes: ['id_user'],
          required: false
        }
      ]
    });

    if (getAllPost.length === 0) {
      return res.status(404).json({
        msg: "Postingan tidak ditemukan"
      });
    }

    return res.json({
      msg: "Postingan ditemukan",
      data: getAllPost
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Terjadi kesalahan dalam mengambil data postingan",
    });
  }
});

router.post('/forum/new-post', uploadCover, forumValidation, async (req, res) => {
  const { title, content } = req.body;
  const userId = req.user;
  const coverPath = req.file ? `../covers_forum/${req.file.filename}` : null;

  const errors = validationResult(req);
  if (!errors.isEmpty() || req.fileValidationError) {
    return res.status(400).json({ errors: errors.array(), cover: req.fileValidationError });
  }

  const newPost = await forumModel.create({
    id_user: userId.id,
    title: title,
    content: content,
    cover: coverPath
  })

  if (!newPost) {
    return res.status(400).json({ msg: "Postingan gagal dibuat" })
  }


  return res.status(201).json({
    msg: "Postingan berhasil dibuat",
    user: userId.nama,
    data: newPost,
  })
})

router.get('/forum/:id', async (req, res) => {
  const postId = req.params.id;

  const getPostById = await forumModel.findOne({
    where: { id: postId },
    include: [{
      model: commentModel,
      as: 'comment',
      include: [{
        model: userModel,
        as: 'user',
        attributes: ['nama', 'photo']
      }]
    }],

  });

  if (!getPostById) {
    return res.status(404).json({ msg: 'Postingan tidak ditemukan' });
  }
  return res.json({
    msg: "Berhasil mendapatkan postingan",
    data: getPostById
  })

})

router.post("/forum/:id/comment/", commentValidation, async (req, res) => {
  const { text } = req.body;
  const postId = req.params.id;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const checkPost = await forumModel.findOne({
      where: { id: postId }
    })

    if (!checkPost) {
      return res.status(404).json({ msg: "Postingan tidak ditemukan" })
    }

    const newComment = await commentModel.create({
      id_post: postId,
      id_user: req.user.id,
      text: text,
    });

    if (!newComment) {
      return res.status(400).json({ msg: "Komentar gagal ditambahkan" });
    }

    return res.status(201).json({
      msg: "Komentar berhasil ditambahkan",
      data: newComment
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Terjadi kesalahan dalam menambahkan komentar" });
  }
});

router.put('/forum/:id/unlike', async (req, res) => {
  const postId = req.params.id;

  const checkPost = await forumModel.findOne({
    where: { id: postId }
  })

  if (!checkPost) {
    return res.status(404).json({ msg: "Postingan tidak ditemukan" })
  }

  const postUnlike = await likesModel.destroy({
    where: {
      id_post: postId,
      id_user: req.user.id,
    },
  });

  if (!postUnlike) {
    return res.status(400).json({ msg: "Anda sudah unlike postingan ini" });
  }

  return res.json({
    msg: "Unlike berhasil"
  });
});


router.put('/forum/:id/like', async (req, res) => {
  const postId = req.params.id;

  const checkPost = await forumModel.findOne({
    where: { id: postId }
  })

  if (!checkPost) {
    return res.status(404).json({ msg: "Postingan tidak ditemukan" })
  }

  const [like, created] = await likesModel.findOrCreate({
    where: {
      id_post: postId,
      id_user: req.user.id
    }
  })

  if (!created) {
    return res.status(400).json({ msg: "Anda sudah menyukai postingan ini" });
  }

  return res.json({
    msg: "Postingan disukai",
    data: like
  })

})

router.get('/forum/posts/find', async (req, res) => {
  const { search } = req.query;

  if (!search) {
    return res.status(400).json({ msg: 'Silahkan masukkan kata kunci' });
  }

  const result = await forumModel.findAll({
    where: {
      [Op.or]: [
        {
          title: {
            [Op.like]: `%${search}%`
          }
        },
        {
          content: {
            [Op.like]: `%${search}%`
          }
        }
      ]
    }
  });

  if (result.length === 0) {
    return res.status(404).json({ msg: 'Postingan tidak ditemukan' })
  }

  return res.json({
    msg: 'Postingan ditemukan',
    data: result
  })

})

module.exports = router;