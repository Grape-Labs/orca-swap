import React, { useCallback } from 'react';
import { WalletError } from '@solana/wallet-adapter-base';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { getOrca, OrcaPool, OrcaPoolConfig } from "@orca-so/sdk";
import Decimal from "decimal.js";
import * as web3 from '@solana/web3.js';

import { styled } from '@mui/material/styles';

import {
  Dialog,
  Button,
  ButtonGroup,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Grid,
  InputLabel,
  Tooltip,
  Typography,
  MenuItem
} from '@mui/material';

import Select, { SelectChangeEvent } from '@mui/material/Select';

//import { MakeLinkableAddress, ValidateAddress } from '../../components/Tools/WalletAddress'; // global key handling
import { useSnackbar } from 'notistack';

import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

function trimAddress(addr: string) {
    if (!addr) return addr;
    let start = addr.substring(0, 8);
    let end = addr.substring(addr.length - 4);
    return `${start}...${end}`;
}

const BootstrapDialog = styled(Dialog)(({ theme }) => ({
  '& .MuDialogContent-root': {
    padding: theme.spacing(2),
  },
  '& .MuDialogActions-root': {
    padding: theme.spacing(1),
  },
}));

export interface DialogTitleProps {
  id: string;
  children?: React.ReactNode;
  onClose: () => void;
}

const BootstrapDialogTitle = (props: DialogTitleProps) => {
  const { children, onClose, ...other } = props;

  return (
    <DialogTitle sx={{ m: 0, p: 2 }} {...other}>
      {children}
      {onClose ? (
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      ) : null}
    </DialogTitle>
  );
};

export default function OrcaSwap(props: any) {
    const [tokenSwapAvailableBalance, setPortfolioSwapTokenAvailableBalance] = React.useState(0);
    const [portfolioPositions, setPortofolioPositions] = React.useState(props.portfolioPositions);
    const [open, setOpen] = React.useState(false);
    const [amounttoswap, setTokensToSwap] = React.useState(0);
    const [userTokenBalanceInput, setTokenBalanceInput] = React.useState(0);
    const [convertedAmountValue, setConvertedAmountValue] = React.useState(0);
    const [tokena, setTokenA] = React.useState(null);
    const [tokenb, setTokenB] = React.useState(null);
    const [lpFees, setLPFees] = React.useState(null);
    const [networkFees, setNetworkFees] = React.useState(null);
    const [minimumOutputAmount, setMinimumOutputAmount] = React.useState(null);
    const [priceImpact, setPriceImpact] = React.useState(null);
    const [rate, setRate] = React.useState(null);
    const [swapfrom, setSwapFrom] = React.useState(props.swapfrom);
    const [swapto, setSwapTo] = React.useState(props.swapto);
    
    const usdc_mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const sol_mint = 'So11111111111111111111111111111111111111112';
    const grape_mint = '8upjSpvjcdpuzhfR1zriwg5NXkwDruejqNE9WNbPRtyA';
    const orca_mint = 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE';

    const [loading, setLoading] = React.useState(false);

    //const mint = props.mint;
    //const logoURI = props.logoURI;
    //const name = props.name;
    //const balance = props.balance;
    ///const conversionrate = props.conversionrate;
    const { connection } = useConnection();
    const orca = getOrca(connection);

    const { publicKey, wallet, sendTransaction } = useWallet();
    const { enqueueSnackbar } = useSnackbar();
    const onError = useCallback(
        (error: WalletError) => {
            enqueueSnackbar(error.message ? `${error.name}: ${error.message}` : error.name, { variant: 'error' });
            console.error(error);
        },
        [enqueueSnackbar]
    );
    const handleClickOpen = () => {
        setTokenBalanceInput(0);
        setTokensToSwap(0);
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
    };

    function getPortfolioTokenBalance(swapingfrom:string){
        let withmint = '';
        if (swapingfrom == 'USDC'){
            withmint = usdc_mint;
        } else if (swapingfrom == 'SOL'){
            withmint = sol_mint;
        } else if (swapingfrom == 'ORCA'){
            withmint = orca_mint;
        }

        let balance = 0;
        portfolioPositions.portfolio.map((token: any) => {
            if (token.mint == withmint){
                if (token.balance > 0)
                    balance = token.balance;
            }
        });
        setPortfolioSwapTokenAvailableBalance(balance);
    }


    const handleSelectChange = (event: SelectChangeEvent) => {
        setSwapFrom(event.target.value);
        getPortfolioTokenBalance(event.target.value);
        setTokenBalanceInput(0);
        setTokensToSwap(0);
        setConvertedAmountValue(0);
        setLPFees(null);
        setNetworkFees(null);
        setMinimumOutputAmount(null);
        setPriceImpact(null);
        setRate(null);
    };

    async function swapTokens(tokenPoolA: OrcaPool, tokenPoolB: OrcaPool, amountToSwap: number) {
        try{
            /*** Swap ***/
            //const orcaSolPool = orca.getPool(OrcaPoolConfig.ORCA_SOL); // Default
            //const tokenPool = orca.getPool(OrcaPoolConfig.GRAPE_USDC);
            let transaction = new Transaction();

            if (!tokenPoolB){
                
                const tokenPairA = tokenPoolA.getTokenB(); // USDC
                const tokenAmount = new Decimal(amountToSwap); // amount in USDC
                const quote = await tokenPoolA.getQuote(tokenPairA, tokenAmount);
                const convertedAmount = quote.getMinOutputAmount();
                const swapPayload = await tokenPoolA.swap(publicKey, tokenPairA, tokenAmount, convertedAmount);
                
                enqueueSnackbar(`Preparing to swap ${tokenAmount.toString()} ${tokenPoolA.getTokenB().name} for at least ${convertedAmount.toNumber()} ${tokenPoolA.getTokenA().name}`,{ variant: 'info' });
                swapPayload.transaction.partialSign(...swapPayload.signers);

                const signedTransaction = await sendTransaction(swapPayload.transaction, connection);
                enqueueSnackbar(`Transaction ready`,{ variant: 'info' });
                await connection.confirmTransaction(signedTransaction, 'processed');
                enqueueSnackbar(`Swapped: ${signedTransaction}`,{ variant: 'success' });
            } else{
                const tokenPairA = tokenPoolA.getTokenA(); // SOL_USDC
                const tokenAmount = new Decimal(amountToSwap); 
                const quote = await tokenPoolA.getQuote(tokenPairA, tokenAmount);
                const convertedAmount = quote.getMinOutputAmount();
                const swapPayload = await tokenPoolA.swap(publicKey, tokenPairA, tokenAmount, convertedAmount);
                
                //swapPayload.transaction.partialSign(...swapPayload.signers);
                
                //enqueueSnackbar(`Step 1. Preparing to swap ${tokenAmount.toString()} ${tokenPoolA.getTokenA().name} for at least ${convertedAmount.toNumber()} ${tokenPoolA.getTokenB().name}`,{ variant: 'info' });
                const tokenPairB = tokenPoolB.getTokenB(); // GRAPE_USDC
                const tokenAmountB = new Decimal(convertedAmount.toNumber()); 
                const quoteB = await tokenPoolB.getQuote(tokenPairB, tokenAmountB); // consider adding slippage amount
                const convertedAmountB = quoteB.getMinOutputAmount();
                //enqueueSnackbar(`Step 2. Preparing to swap ${tokenAmountB.toString()} ${tokenPoolB.getTokenB().name} for at least ${convertedAmountB.toNumber()} ${tokenPoolB.getTokenA().name}`,{ variant: 'info' });
                const swapPayloadB = await tokenPoolB.swap(publicKey, tokenPairB, tokenAmountB, convertedAmountB);
                
                //swapPayloadB.transaction.partialSign(...swapPayload.signers);
                
                enqueueSnackbar(`Preparing to swap ${tokenAmount.toString()} ${tokenPoolA.getTokenA().name} for at least ${convertedAmountB.toNumber()} ${tokenPoolB.getTokenA().name}`,{ variant: 'info' });
                
                transaction = swapPayload.transaction.add(swapPayloadB.transaction);
                transaction.partialSign(...swapPayload.signers);
                transaction.partialSign(...swapPayloadB.signers);

                const signedTransaction = await sendTransaction(transaction, connection);

                enqueueSnackbar(`Transaction ready`,{ variant: 'info' });
                await connection.confirmTransaction(signedTransaction, 'processed');
                enqueueSnackbar(`Swapped: ${signedTransaction}`,{ variant: 'success' });
            }

            
        } catch(e){
            enqueueSnackbar(`${e}`,{ variant: 'error' });
        }
    }

    async function getConvertedValue(tokenPoolA: OrcaPool, tokenPoolB: OrcaPool, amountToSwap: number) {
        setLoading(true);
        try{
            if (!tokenPoolB){ // USDC_GRAPE CONVERSION
                //const tokenPool = orca.getPool(OrcaPoolConfig.GRAPE_USDC);
                const tokenPair = tokenPoolA.getTokenB(); // USDC 
                const tokenAmount = new Decimal(amountToSwap); // amount in USDC
                const quote = await tokenPoolA.getQuote(tokenPair, tokenAmount);
                const convertedAmount = quote.getMinOutputAmount();
                
                const lpfees = quote.getLPFees();
                const networkfees = quote.getNetworkFees();
                const expectedoutputamount = quote.getExpectedOutputAmount();
                const priceimpact = quote.getPriceImpact();
                const rate = quote.getRate();
                
                setTokenA(tokenPoolA.getTokenA().name);
                setTokenB(tokenPoolA.getTokenB().name);
                
                setConvertedAmountValue(expectedoutputamount.toNumber());
                setLPFees(lpfees.toNumber());
                setNetworkFees(networkfees.toNumber());
                setMinimumOutputAmount(convertedAmount.toNumber());
                setPriceImpact(priceimpact.toNumber());
                setRate(rate.toNumber());
            } else { // SOL_USDC ... GRAPE_USDC conversion
                const tokenPairA = tokenPoolA.getTokenA(); // SOL_USDC
                const tokenAmount = new Decimal(amountToSwap); 
                const quote = await tokenPoolA.getQuote(tokenPairA, tokenAmount);
                const convertedAmount = quote.getMinOutputAmount();
                //enqueueSnackbar(`Step 1. Preparing to swap ${tokenAmount.toString()} ${tokenPoolA.getTokenA().name} for at least ${convertedAmount.toNumber()} ${tokenPoolA.getTokenB().name}`,{ variant: 'info' });
                const tokenPairB = tokenPoolB.getTokenB(); // GRAPE_USDC
                const tokenAmountB = new Decimal(convertedAmount.toNumber()); 
                const quoteB = await tokenPoolB.getQuote(tokenPairB, tokenAmountB); // consider adding slippage amount
                const convertedAmountB = quoteB.getMinOutputAmount();
                //enqueueSnackbar(`Step 2. Preparing to swap ${tokenAmountB.toString()} ${tokenPoolB.getTokenB().name} for at least ${convertedAmountB.toNumber()} ${tokenPoolB.getTokenA().name}`,{ variant: 'info' });
                //const swapPayloadB = await tokenPoolB.swap(publicKey, tokenPairB, tokenAmountB, convertedAmountB);

                setTokenA(tokenPoolA.getTokenA().name);
                setTokenB(tokenPoolB.getTokenB().name);
                
                const lpfees = quote.getLPFees();
                const networkfees = quote.getNetworkFees();
                const expectedoutputamount = quote.getExpectedOutputAmount();
                const priceimpact = quote.getPriceImpact();
                const rate = quote.getRate();

                const lpfeesB = quoteB.getLPFees();
                const networkfeesB = quoteB.getNetworkFees();
                const expectedoutputamountB = quoteB.getExpectedOutputAmount();
                const priceimpactB = quoteB.getPriceImpact();
                const rateB = quoteB.getRate();
                /*
                console.log("lpfees: "+lpfees.toNumber());
                console.log("networkfees: "+networkfees.toNumber());
                console.log("expectedoutputamount: "+expectedoutputamount.toNumber());
                console.log("priceimpact: "+priceimpact);
                console.log("rate: "+rate.toNumber());
                console.log("***");
                console.log("lpfeesB: "+lpfeesB.toNumber());
                console.log("networkfeesB: "+networkfeesB.toNumber());
                console.log("expectedoutputamountB: "+expectedoutputamountB.toNumber());
                console.log("priceimpactB: "+priceimpactB);
                console.log("rateB: "+rateB.toNumber());
                */
                setConvertedAmountValue(expectedoutputamountB.toNumber());
                setLPFees(lpfees.toNumber()+lpfeesB.toNumber());
                setNetworkFees(networkfees.toNumber());

                setMinimumOutputAmount(convertedAmountB.toNumber());
                setPriceImpact(priceimpact.toNumber()+priceimpactB.toNumber());
                
                //1 SOL = rate.toNumber() USDC
                //1 USDC = X grape
                
                setRate(rateB.toNumber()*rate.toNumber());
            }
        } catch(e){
            enqueueSnackbar(`${e}`,{ variant: 'error' });
        }
        setLoading(false);
    }
    
    function HandleSendSubmit(event: any) {
        event.preventDefault();
        if ((amounttoswap > 0)&&(amounttoswap < 99999999999999)){
            if ((swapfrom === 'USDC') && (swapto === 'GRAPE')){
                const tokenPool = orca.getPool(OrcaPoolConfig.GRAPE_USDC);    
                swapTokens(tokenPool, null, amounttoswap);
                handleClose();
            } else if ((swapfrom === 'SOL') && (swapto === 'GRAPE')){
                const tokenPoolA = orca.getPool(OrcaPoolConfig.SOL_USDC);
                const tokenPoolB = orca.getPool(OrcaPoolConfig.GRAPE_USDC);
                swapTokens(tokenPoolA, tokenPoolB, amounttoswap);
                handleClose();
            } else if ((swapfrom === 'ORCA') && (swapto === 'GRAPE')){
                const tokenPoolA = orca.getPool(OrcaPoolConfig.ORCA_USDC);
                const tokenPoolB = orca.getPool(OrcaPoolConfig.GRAPE_USDC);
                swapTokens(tokenPoolA, tokenPoolB, amounttoswap);
                handleClose();
            }
        }else{
            setConvertedAmountValue(0);
            enqueueSnackbar(`Enter the balance you would like to send`,{ variant: 'error' });
        }
    }

    React.useEffect(() => {
        getPortfolioTokenBalance(swapfrom);
    }, []);

    React.useEffect(() => {

        // get the balance for this token
        if ((amounttoswap > 0)&&(amounttoswap < 99999999999999)){
            if ((swapfrom === 'USDC') && (swapto === 'GRAPE')){
                const tokenPool = orca.getPool(OrcaPoolConfig.GRAPE_USDC);
                getConvertedValue(tokenPool, null, amounttoswap);
            } else if ((swapfrom === 'SOL') && (swapto === 'GRAPE')){
                const tokenPoolA = orca.getPool(OrcaPoolConfig.SOL_USDC);
                const tokenPoolB = orca.getPool(OrcaPoolConfig.GRAPE_USDC);
                getConvertedValue(tokenPoolA, tokenPoolB,amounttoswap);
            } else if ((swapfrom === 'ORCA') && (swapto === 'GRAPE')){
                const tokenPoolA = orca.getPool(OrcaPoolConfig.ORCA_USDC);
                const tokenPoolB = orca.getPool(OrcaPoolConfig.GRAPE_USDC);
                getConvertedValue(tokenPoolA, tokenPoolB,amounttoswap);
            }
        } else{
            setConvertedAmountValue(0);
            setLPFees(null);
            setNetworkFees(null);
            setMinimumOutputAmount(null);
            setPriceImpact(null);
            setRate(null);
        }
    }, [amounttoswap]);
    
    return (
        <div>
            <Button
                variant="outlined" 
                //aria-controls={menuId}
                title={`Swap ${swapfrom} > ${swapto}`}
                onClick={handleClickOpen}
                size="small"
                //onClick={isConnected ? handleProfileMenuOpen : handleOpen}
                >
                {swapfrom} <SwapHorizIcon sx={{mr:1,ml:1}} /> {swapto}
            </Button>
        <BootstrapDialog
            onClose={handleClose}
            aria-labelledby="customized-dialog-title"
            open={open}
        >   
            <form onSubmit={HandleSendSubmit}>
                <BootstrapDialogTitle id="customized-dialog-title" onClose={handleClose}>
                    Swap
                </BootstrapDialogTitle>
                <DialogContent dividers>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>     
                                    <Grid container>
                                        <Grid item xs={6}> 
                                            <FormControl> 
                                                <InputLabel id="from-label">From</InputLabel>
                                                <Select
                                                    labelId="from-label"
                                                    id="from-select-dropdown"
                                                    fullWidth
                                                    value={swapfrom}
                                                    onChange={handleSelectChange}
                                                    label="From"
                                                    >
                                                    <MenuItem value="USDC">USDC</MenuItem>
                                                    <MenuItem value="SOL">SOL</MenuItem>
                                                    <MenuItem value="ORCA">ORCA</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <TextField 
                                                id="swap-token-amount" 
                                                inputRef={input => input && input.focus()}
                                                fullWidth 
                                                placeholder="0.00" 
                                                autoComplete="off"
                                                variant="outlined"
                                                //value={parseFloat((userTokenBalanceInput).toString().replace(/^0|[1-9]+/, ''))}
                                                value={userTokenBalanceInput}
                                                type="number"
                                                onChange={(e) => {
                                                    // here add an additional check if valid number
                                                    // let regex = 
                                                    // regex.text(e.target.value){
                                                    setTokensToSwap(+e.target.value)
                                                    setTokenBalanceInput(+e.target.value)
                                                    // }
                                                }}
                                                InputProps={{
                                                    inputProps: {
                                                        step: 0.000000001,
                                                        style: {
                                                            textAlign:'right'
                                                        }
                                                    }
                                                }}
                                            />
                                        </Grid>
                                    </Grid>
                            </Grid>
                            <Grid item xs={12}>
                                <Grid container>
                                    <Grid item xs={2}>
                                                    
                                    </Grid>
                                    <Grid item xs={10}
                                        sx={{textAlign:'right'}}
                                    >
                                        <Typography
                                            variant="caption"  
                                        >
                                            Balance: {tokenSwapAvailableBalance} {swapfrom}
                                            <ButtonGroup variant="text" size="small" aria-label="outlined primary button group" sx={{ml:1}}>
                                                <Button 
                                                    onClick={() => {
                                                        setTokensToSwap(tokenSwapAvailableBalance);
                                                        setTokenBalanceInput(tokenSwapAvailableBalance);
                                                    }}
                                                > 
                                                    Max 
                                                </Button>
                                                <Button  
                                                    onClick={() => {
                                                        setTokensToSwap(+tokenSwapAvailableBalance/2);
                                                        setTokenBalanceInput(+tokenSwapAvailableBalance/2);
                                                    }}
                                                > 
                                                    Half
                                                </Button>
                                            </ButtonGroup>
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Grid>

                            <Grid item xs={12}>
                                <Grid container>
                                    <Grid item xs={6}> 
                                        <FormControl> 
                                            <InputLabel id="to-label">To</InputLabel>
                                            <Select
                                                labelId="to-label"
                                                id="to-select-dropdown"
                                                fullWidth
                                                value={swapto}
                                                label="To"
                                                disabled 
                                                defaultValue="Disabled"
                                                >
                                                <MenuItem value="GRAPE">GRAPE</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField 
                                            id="swap-result" 
                                            fullWidth 
                                            autoComplete="off"
                                            value={convertedAmountValue}
                                            type="number"
                                            variant="outlined"
                                            disabled 
                                            defaultValue="Disabled"
                                            InputProps={{
                                                inputProps: {
                                                    style: {
                                                        textAlign:'right'
                                                    }
                                                }
                                            }}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                        <p>
                        {!loading ?
                            <Typography variant="caption" sx={{color:"#aaaaaa"}}>
                                {priceImpact &&
                                    <Grid container spacing={1}>
                                        <Grid item xs={6}
                                            sx={{
                                                textAlign:'right'
                                            }}
                                        >
                                        Price Impact <Tooltip title={`Swaping shifts the ratio of tokens in the pool, which will cause a change in the price per token`}><HelpOutlineIcon sx={{ fontSize:14  }}/></Tooltip>
                                        </Grid>
                                        <Grid item xs={6}
                                            sx={{
                                                textAlign:'right'
                                            }}
                                        > 
                                            {(priceImpact).toFixed(2)}%
                                        </Grid>
                                    </Grid>
                                } 
                                {minimumOutputAmount &&
                                    <Grid container spacing={1}>
                                        <Grid item xs={6}
                                            sx={{
                                                textAlign:'right'
                                            }}
                                        >
                                        Minimum Received <Tooltip title={`1% slippage tolerance`}><HelpOutlineIcon sx={{ fontSize:14  }}/></Tooltip>
                                        </Grid>
                                        <Grid item xs={6}
                                            sx={{
                                                textAlign:'right'
                                            }}
                                        > 
                                            {minimumOutputAmount.toFixed(6)} {swapto}
                                        </Grid>
                                    </Grid>
                                } 

                                {rate &&
                                    <Grid container spacing={1}>
                                        <Grid item xs={6}
                                            sx={{
                                                textAlign:'right'
                                            }}
                                        >
                                        Rate
                                        </Grid>
                                        <Grid item xs={6}
                                            sx={{
                                                textAlign:'right'
                                            }}
                                        > 
                                            {rate.toFixed(6)} {swapto} per {swapfrom}
                                        </Grid>
                                    </Grid>
                                } 
                                {lpFees &&
                                    <Grid container spacing={1}>
                                        <>
                                        <Grid item xs={6}
                                            sx={{
                                                textAlign:'right'
                                            }}
                                        >
                                            SWAP Fees <Tooltip title={`ORCA Swap Fees (to LPs): including 0.05% split 80/20 Orca Treasury and Orca Impact Fund`}><HelpOutlineIcon sx={{ fontSize:14  }}/></Tooltip>
                                        </Grid>
                                        <Grid item xs={6}
                                            sx={{
                                                textAlign:'right'
                                            }}
                                        > 
                                            {swapfrom !== 'SOL' ?
                                                <>
                                                {(lpFees/amounttoswap*100).toFixed(2)}% = ${lpFees.toFixed(6)}
                                                </>
                                            :
                                                <>{(0.30)}% + {(0.30)}% = ~${lpFees.toFixed(6)*2}</>
                                            }
                                        </Grid>
                                        </>
                                    </Grid>
                                } 
                                {networkFees &&
                                    <Grid container spacing={1}>
                                        <Grid item xs={6}
                                            sx={{
                                                textAlign:'right'
                                            }}
                                        >
                                        Network Fees
                                        </Grid>
                                        <Grid item xs={6}
                                            sx={{
                                                textAlign:'right'
                                            }}
                                        > 
                                            {(networkFees/web3.LAMPORTS_PER_SOL)} SOL
                                        </Grid>
                                    </Grid>
                                } 
                            </Typography>
                        :
                            <Typography variant="caption" sx={{color:"#aaaaaa"}}>
                                <Grid container spacing={1}>
                                    <Grid item xs={12} 
                                            sx={{
                                                textAlign:'center'
                                            }}>
                                        loading...
                                    </Grid>
                                </Grid>
                            </Typography>
                        }
                        </p>
                        
                </DialogContent>
                <DialogActions>
                    <Button     
                        fullWidth
                        type="submit"
                        variant="outlined" 
                        title="Swap"
                        disabled={userTokenBalanceInput > tokenSwapAvailableBalance}
                        sx={{
                            margin:1
                        }}>
                        Swap
                    </Button>
                </DialogActions>
            </form>
        </BootstrapDialog>
        </div>
    );
}