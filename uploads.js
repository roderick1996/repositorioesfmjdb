const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'esfm/pdfs',
    resource_type: 'raw',
    format: 'pdf',
    public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  }),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF'));
  },
});

module.exports = { upload, cloudinary };
