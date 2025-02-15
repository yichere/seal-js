if (!seal.ext.find("test")) {
    const ext = seal.ext.new("test", "炽热", "1.0.0");
  
    seal.ext.register(ext);
    let cmdTest = seal.ext.newCmdItemInfo();
    cmdTest.name = "test";
    cmdTest.solve = (ctx,msg,cmdArgs) =>{
        console.log("test")
        console.log(msg.message)
        console.log(cmdArgs.args[0])
    }
    ext.cmdMap["test"] = cmdTest;
}