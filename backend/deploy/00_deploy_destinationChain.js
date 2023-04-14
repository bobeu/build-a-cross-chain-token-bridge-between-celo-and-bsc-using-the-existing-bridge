module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const MAX_REQUEST = 1000;

  const bridgeBsc = await deploy("BSCBridgeWithToken", {
    from: deployer,
    args: [MAX_REQUEST],
    log: true,
  });

  console.log(`Bridge_BSC deployed to: ${bridgeBsc.address}\n`);
};


module.exports.tags = ["BSCBridgeWithToken"];
