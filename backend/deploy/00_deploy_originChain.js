module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const MAX_REQUEST = 1000;

  const bridgeCelo = await deploy("CeloBridgeWithToken", {
    from: deployer,
    args: [MAX_REQUEST],
    log: true,
  });

  console.log(`Celo_BSC deployed to: ${bridgeCelo.address}\n`);
};

module.exports.tags = ["CeloBridgeWithToken"];
