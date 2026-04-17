function mongoMigrationPending(req, res) {
  return res.status(501).json({
    success: false,
    message:
      "Family Feud endpoints were migrated away from external generated content and local JSON files. MongoDB schema integration is pending.",
  });
}

module.exports = {
  getFamilyFeud: mongoMigrationPending,
  startFamilyFeudRound: mongoMigrationPending,
  getRoundState: mongoMigrationPending,
  submitAnswer: mongoMigrationPending,
  updateCurrentTeam: mongoMigrationPending,
};
