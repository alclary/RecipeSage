'use strict';
module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    type: DataTypes.STRING,
    token: DataTypes.STRING,
    expires: DataTypes.DATE
  }, {});
  Session.associate = function(models) {
    Session.belongsTo(models.User, {
      foreignKey: 'userId',
      onDelete: 'CASCADE',
    });
  };
  return Session;
};
