## Main differences

**Old version**: https://github.com/ElrondNetwork/elrond-eth-bridge/tree/437947a0c447b80f78f578bd5fb0f13b74c6fcde

**New version**: https://github.com/ElrondNetwork/sc-bridge-ethereum-sol/tree/bd5a9b63dd869a99470469385d2b15896d40908e

### Functionality diff

#### Contracts

**Bridge**

- Enumerable Relayers

**Safe**

- When adding a new Relayer, the address is checked to be a contract

#### Framework

- can run test coverage with solvcover.js
- exports abi to separate folder and they can be published as an npm package
- moves all tasks to individual files in the `tasks` folder

### Code size differences

> **[OLD]** LINES OF CODE 437947a0c447b80f78f578bd5fb0f13b74c6fcde

```
-----------------------------------------------------------------------------------------
File                                       blank        comment           code
-----------------------------------------------------------------------------------------
contracts/Bridge.sol                          43             85            239
contracts/ERC20Safe.sol                       23             51            125
contracts/SharedStructs.sol                    3              1             22
contracts/AFCoin.sol                           3              1             10
contracts/GenericERC20.sol                     3              1              9
-----------------------------------------------------------------------------------------
SUM:                                          75            139            405
-----------------------------------------------------------------------------------------

-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
Solidity                         5             75            139            405
-------------------------------------------------------------------------------
SUM:                             5             75            139            405
-------------------------------------------------------------------------------
```

> **[NEW]** LINES OF CODE bd5a9b63dd869a99470469385d2b15896d40908e

```
-----------------------------------------------------------------------------------------
File                                                     blank        comment        code
-----------------------------------------------------------------------------------------
contracts/Bridge.sol                                        38             72         120
contracts/ERC20Safe.sol                                     20             53         103
contracts/access/RelayerRole.sol                            18             15          52
contracts/utils/structs/EnumerableSet.sol                   16             73          44
contracts/access/BridgeRole.sol                             11             25          30
contracts/access/AdminRole.sol                               8             33          26
contracts/SharedStructs.sol                                  4              1          22
contracts/AFCoin.sol                                         4              1          10
contracts/GenericERC20.sol                                   4              1           8
-----------------------------------------------------------------------------------------
SUM:                                                       123            274         415
-----------------------------------------------------------------------------------------

-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
Solidity                         9            123            274            415
-------------------------------------------------------------------------------
SUM:                             9            123            274            415
-------------------------------------------------------------------------------
```
