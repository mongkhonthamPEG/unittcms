function defineRunCaseEvidence(sequelize, DataTypes) {
  const RunCaseEvidence = sequelize.define(
    'RunCaseEvidence',
    {
      runCaseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      kind: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      filename: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: 'runCaseEvidence',
    }
  );

  RunCaseEvidence.associate = (models) => {
    RunCaseEvidence.belongsTo(models.RunCase, {
      foreignKey: 'runCaseId',
      onDelete: 'CASCADE',
    });
    RunCaseEvidence.belongsTo(models.User, {
      as: 'uploadedBy',
      foreignKey: 'userId',
      onDelete: 'SET NULL',
    });
  };

  return RunCaseEvidence;
}

export default defineRunCaseEvidence;
