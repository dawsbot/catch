import { ethers } from "ethers";

const liveContracts = {
  "100": {
    /* Gnosis Chain */
    contractAddress: "0x70842AcB25e4381A24D489d6d3FB656C634f97eD",
    rpcUrl: "https://gnosis.api.onfinality.io/public",
  },
  "137": {
    /* Polygon Mainnet */
    contractAddress: "0xCBBB04FDe79E40e98d6c49B539abd60858C7b525",
    rpcUrl: "https://polygon.rpc.blxrbdn.com",
  },
  "167002": {
    /* Taiko Hackathon L2 */
    contractAddress: "0x70842AcB25e4381A24D489d6d3FB656C634f97eD",
    rpcUrl: "https://l2rpc.hackathon.taiko.xyz",
  },
  "44787": {
    /* Celo Alfajores Testnet */
    contractAddress: "0x70842AcB25e4381A24D489d6d3FB656C634f97eD",
    rpcUrl: "https://alfajores-forno.celo-testnet.org",
  },
  "534353": {
    /* scroll alpha testnet */
    contractAddress: "todo",
    rpcUrl: "https://alpha-rpc.scroll.io/l2 ",
  },
  "59140": {
    /* linea testnet */
    contractAddress: "todo",
    rpcUrl: "https://rpc.goerli.linea.build",
  },
};

const abi = [
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "catchConfigs",
    outputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "string", name: "functionSignature", type: "string" },
      { internalType: "string", name: "cacheIfEqualTo", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllCatchConfigs",
    outputs: [
      { internalType: "address[]", name: "", type: "address[]" },
      { internalType: "string[]", name: "", type: "string[]" },
      { internalType: "string[]", name: "", type: "string[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "string", name: "_functionSignature", type: "string" },
      { internalType: "string", name: "_cacheIfEqualTo", type: "string" },
    ],
    name: "pushCatchConfig",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "index", type: "uint256" }],
    name: "removeCatchConfig",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

type SmartContractResponse = [Array<string>, Array<string>, Array<string>];
export async function fetchRemoteCachedConfig(
  chainId: keyof typeof liveContracts
) {
  const { contractAddress, rpcUrl } = liveContracts[chainId];
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, abi, provider);
  const allCatchConfigs =
    (await contract.getAllCatchConfigs()) as SmartContractResponse;
  let toReturn = [];
  for (let i = 0; i < allCatchConfigs[0].length; i++) {
    toReturn.push({
      toAddress: allCatchConfigs[0][i],
      functionSignature: allCatchConfigs[1][i],
      checkResultShouldBeCached: (res: unknown) =>
        res === allCatchConfigs[2][i],
    });
  }
  return toReturn;
}
