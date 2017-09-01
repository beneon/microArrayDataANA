file <- commandArgs(TRUE)
tbl<-read.csv(file,header=TRUE,sep=",")
fit <- aov(data ~ factor, data=tbl)
summary(fit)
