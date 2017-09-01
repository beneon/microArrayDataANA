const R = require('r-script');
const assert = require('assert');
const shell = require('shelljs');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const lineDelim = '\r\n'
var inputpath = path.join(__dirname,'file')
var outputpath = path.join(__dirname,'output')
var inputFileNum = process.argv[2]||5
var inputFileName = `mCYT${inputFileNum} Service Report.xlsx`
var outputfilename = path.join(outputpath,inputFileName.replace(/.xlsx$/,".csv"))
var data = xlsx.readFile(path.join(inputpath,inputFileName))
const ws = data.Sheets['Raw Data']
const wsJSON = xlsx.utils.sheet_to_json(ws)
var ids = Array.from(
	new Set(
		wsJSON.map(e=>e['ID'])
	)
)
function data4thisID(geneID){
	return wsJSON.filter(e=>e['ID']==geneID).slice(0)
}
function data2AOA(data){
	var header = []
	var dataStorage = []
	assert(data.length>0,"data neet to be array in data2AOA")
	for(key in data[0]){
		header.push(key)
	}
	data.forEach(dataE=>{
		dataStorage.push(
			header.map((hdrE,hdrI)=>{
				return dataE[hdrE].replace(/[,，]/g,"")
			})
		)
	})
	return [header].concat(dataStorage)
}

function aoa2Factorsheet(data){
	var df = data.slice(1)
	var rst = [['data','factor']]
	data.forEach((row,rowIND)=>{
		if(rowIND>0){
			var subcolumns = row.slice(1,row.length)
			subcolumns.forEach((cell,colum)=>{
				if(colum>0)rst.push([cell,colum])
			})
		}
	})
	return rst
}

function aoa_to_csv(aoa,joinSymb=','){
	return aoa.map((row)=>row.join(joinSymb)).join(lineDelim)+lineDelim
}
function jsonArr_to_csv(jsonArr,joinSymb=','){
	function iterableJoin(entry,header){
		return keyIterate(entry,header).join(joinSymb)
	}
	var rst = iterableJoin(jsonArr[0],true)+lineDelim
	rst = rst + jsonArr.map(e=>iterableJoin(e)).join(lineDelim)
	return rst
}
function keyIterate(obj,header=false){
	var rst = []
	for(key in obj){
		if(header){
			rst.push(key)
		}else{
			rst.push(obj[key])
		}
	}
	return rst
}

function writeCSVandCalculate(data){
	var intermediateFile = path.join(inputpath,'intermediate.csv')
	fs.writeFileSync(intermediateFile,data)
	var rst = shell.exec('rscript anova.R '+intermediateFile).stdout
	return rst
}
var wsJSONInGroup = ids.map((geneID)=>{
	var data = data4thisID(geneID)
	data = data2AOA(data)
	data = aoa2Factorsheet(data)
	data = aoa_to_csv(data)
	data = writeCSVandCalculate(data)
	return {geneID:geneID,report:data}
})
// console.log(wsJSONInGroup);
var outputArr = wsJSONInGroup.map(e=>{
	pValReg = /\s([\d\-\+\.e]+)\s*[\*\.]*\s*\nResiduals/m
	if(pValReg.test(e.report)){
		return {
			geneID:e.geneID,
			pVal:pValReg.exec(e.report)[1]
		}
	}else{
		console.error("no match for "+e.report)
	}
})
fs.writeFileSync(outputfilename,jsonArr_to_csv(outputArr))
console.log("file written to %s",outputfilename);
