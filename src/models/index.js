const dbConfig = require("../config/database.config");

const Sequelize = require("sequelize");

const sequelize = new Sequelize(
    dbConfig.DB,
    dbConfig.USER,
    dbConfig.PASSWORD,
    {
        host: dbConfig.HOST,
        dialect: dbConfig.DIALECT,
        port: dbConfig.PORT,
        define: {
            timestamps: false,
            freezeTableName: true
        },
        logging: true
    }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.userModel = require("./user.model")(sequelize, Sequelize);
db.artikelModel = require('./artikel.model')(sequelize, Sequelize);
db.bookmarkModel = require('./bookmark.model')(sequelize, Sequelize);

//relasi
// User.belongsToMany(Artikel, { through: Bookmark, foreignKey: 'id_user' });
// Artikel.belongsToMany(User, { through: Bookmark, foreignKey: 'id_artikel' });

module.exports = db;