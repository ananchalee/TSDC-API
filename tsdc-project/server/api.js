var express = require('express');
var sql = require('mssql');
var fs = require('fs');
var app = express.Router();
var bodyParser = require('body-parser');
const { query } = require('express');
var path = require('path');
require('./config/connect.js');
app.use(bodyParser.json());
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

//////////////// DATE TIME NOW ///////////////////
function DateNow(nDateTime) {
    function addZero(i) {
        if (i < 10) {
            i = "0" + i;
        }
        return i;
    }
    var nDate = (new Date()).toISOString().slice(0, 10);
    var d = new Date();
    var h = addZero(d.getHours());
    var m = addZero(d.getMinutes());
    var s = addZero(d.getSeconds());
    return nDateTime = nDate + " " + h + ":" + m + ":" + s;
}

app.get('/serverdate', (req, res) => {
    const currentDateTime = DateNow();
    res.json({ date: currentDateTime });
});

app.get('/download/:filename', function (req, res) {
    var filename = req.params.filename;
    var file = __dirname + '/files/' + filename;
    res.download(file);
});

app.get('/downloadfile_NetworkPath', (req, res) => {
    const NETWORK_BASE_PATHS = {
        '23': '\\\\10.26.1.23',
        '26': '\\\\10.26.1.26',
    };

    const networkKey = req.query.networkKey;
    const relativePath = decodeURIComponent(req.query.path || '').replace(/^[/\\]+/, ''); // ลบ / หรือ \ นำหน้าออก
    const basePath = NETWORK_BASE_PATHS[networkKey];
    const fullPath = path.join(basePath, relativePath);

    if (!networkKey || !relativePath) {
        return res.status(400).send('networkKey และ path ต้องถูกระบุ');
    }

    if (!basePath) {
        return res.status(403).send('networkKey นี้ไม่ได้รับอนุญาต');
    }

    // ตรวจสอบไฟล์ว่ามีอยู่และอ่านได้หรือไม่
    fs.access(fullPath, fs.constants.F_OK | fs.constants.R_OK, (err) => {
        if (err) {
            if (err.code === 'ENOENT') return res.status(404).send('ไม่พบไฟล์');
            if (err.code === 'EACCES') return res.status(403).send('ไม่มีสิทธิ์เข้าถึงไฟล์');
            return res.status(500).send('เกิดข้อผิดพลาด: ' + err.message);
        }

        // ส่งไฟล์ให้ client ดาวน์โหลด
        res.download(fullPath, path.basename(fullPath), (err) => {
            if (err) {
                console.error('ดาวน์โหลดล้มเหลว:', err);
                return res.status(500).send('ดาวน์โหลดล้มเหลว');
            }
        });
    });
});

app.post('/checkpathfile_labeltrack', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `      
        
        select  *  from [10.26.1.11].[TSDC_CONVEYOR].[DBO].ONLINE_ORDER_SHIPPING
        where  RTS_STATUS_OOS = 'S'
        and FILE_PACKING_OOS != ''
        and FILE_PACKING_OOS is not null
        and TRACKING_OOS != ''
        and TRACKING_OOS is not null
        and order_number_oos = '${fromdata.shipment_id}'
        and SHOPID_OOS = '${fromdata.SELLER_NO}'
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});



app.post('/login', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    var query;
    new sql.ConnectionPool(db).connect().then(pool => {
        query = `
        SELECT 
            INTERNAL_ID,USER_ID,CATEGORY,SUB_CATEGORY,FIRSTNAME,LASTNAME,WORKER_ID
            FROM 
                [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_EMPLOYEE 
        WHERE 
            USER_ID = '${fromdata.user_id}' 
            AND STATUS = '1'
            AND PASSWORD ='${fromdata.password}';

       
                `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset[0];
                if (recordset.recordset.length == 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        member: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.post('/LOAD_USERTABLECHECK', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `      
        
        update TSDC_USER_TABLECHECK
        set CHECKOUT_DATE = getdate()
        where CHECKOUT_DATE is null
        and WORKING_TYPE = 'Pack'
        and CONVERT(date,CHECKIN_DATE) = CONVERT(date,GETDATE()-1) 
                    
     select TABLE_CHECK,PIN_CODE,USER_NAME,WORKER_NAME,WORKER_SURNAME,max_date = max(datetime_stamp)
     from TSDC_USER_TABLECHECK
     where datetime_stamp = 
       ( select max_date = max(datetime_stamp) from TSDC_USER_TABLECHECK
          where TABLE_CHECK = '${fromdata.TABLE_CHECK}'
          and WORKING_TYPE != 'Pack'
          group by TABLE_CHECK)
      and  TABLE_CHECK = '${fromdata.TABLE_CHECK}'
      and WORKING_TYPE != 'Pack'
       group by TABLE_CHECK,PIN_CODE,USER_NAME,WORKER_NAME,WORKER_SURNAME   
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/insert_user_tablecheck', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        
			   insert into TSDC_USER_TABLECHECK
               (  [TABLE_CHECK]
                ,[USER_NAME]
                ,[WORKER_NAME]
                ,[WORKER_SURNAME]
                ,[WORKER_COMPANY]
                ,[PIN_CODE]
                ,[DATETIME_STAMP])
                select 
                 LTRIM(RTRIM('${fromdata.TABLE_CHECK}'))
                  ,t.USER_NAME 
                  ,t.WORKER_NAME
                  ,t.WORKER_SURNAME
                  ,t.WORKER_COMPANY
                  ,'${fromdata.PIN_CODE}'
                  ,getdate() 
                  
                 FROM [10.26.1.11].[TSDC_CONVEYOR].[DBO].[USER_PINCODE] t
                  where PIN_CODE = '${fromdata.PIN_CODE}'
      
           
     `;

        query += `
     
              
     select TABLE_CHECK,PIN_CODE,USER_NAME,WORKER_NAME,WORKER_SURNAME,max_date = max(datetime_stamp)
     from TSDC_USER_TABLECHECK
     where datetime_stamp = 
       ( select max_date = max(datetime_stamp) from TSDC_USER_TABLECHECK
          where TABLE_CHECK = '${fromdata.TABLE_CHECK}'
          group by TABLE_CHECK)
      and  TABLE_CHECK = '${fromdata.TABLE_CHECK}'
       group by TABLE_CHECK,PIN_CODE,USER_NAME,WORKER_NAME,WORKER_SURNAME

    `;

        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.get('/get_userpincode', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        
     
        select *  FROM [10.26.1.11].[TSDC_CONVEYOR].[DBO].[USER_PINCODE]
                       

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/insert_user_tablecheck2', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        
			   insert into TSDC_USER_TABLECHECK
               (  [TABLE_CHECK]
                ,[USER_NAME]
                ,[WORKER_NAME]
                ,[WORKER_SURNAME]
                ,[WORKER_COMPANY]
                ,[PIN_CODE]
                ,[DATETIME_STAMP]
                ,WORKING_TYPE
                ,CHECKIN_DATE
                ,CHECKOUT_DATE)
                select 
                 LTRIM(RTRIM('${fromdata.TABLE_CHECK}'))
                  ,t.USER_NAME 
                  ,t.WORKER_NAME
                  ,t.WORKER_SURNAME
                  ,t.WORKER_COMPANY
                  ,'${fromdata.PIN_CODE}'
                  ,getdate() 
                  ,'${fromdata.WORKING_TYPE}'
                  ,getdate() 
                  ,NULL
                 FROM [10.26.1.11].[TSDC_CONVEYOR].[DBO].[USER_PINCODE] t
                  where PIN_CODE = '${fromdata.PIN_CODE}'
      
           
     `;

        query += `
     
              
        select TABLE_CHECK,PIN_CODE,USER_NAME,WORKER_NAME,WORKER_SURNAME,CONVERT(VARCHAR(8),CONVERT(DATETIME, CHECKIN_DATE , 0), 108) as CHECKIN_DATE
        from TSDC_USER_TABLECHECK
        where CONVERT(date,CHECKIN_DATE) = CONVERT(date,GETDATE()) 
         and  TABLE_CHECK = '${fromdata.TABLE_CHECK}'
         and WORKING_TYPE = '${fromdata.WORKING_TYPE}'
         and CHECKOUT_DATE is null
         order by CHECKIN_DATE

    `;

        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query,
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/load_checkinPack', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        
     
              
        select TABLE_CHECK,PIN_CODE,USER_NAME,WORKER_NAME,WORKER_SURNAME,CONVERT(VARCHAR(8),CONVERT(DATETIME, CHECKIN_DATE , 0), 108) as CHECKIN_DATE
        from TSDC_USER_TABLECHECK
        where CONVERT(date,CHECKIN_DATE) = CONVERT(date,GETDATE()) 
         and  TABLE_CHECK = '${fromdata.TABLE_CHECK}'
         and WORKING_TYPE = 'Pack'
         and CHECKOUT_DATE is null
         order by CHECKIN_DATE  
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/load_historyPack', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        
     
              
        select TABLE_CHECK,PIN_CODE,USER_NAME,WORKER_NAME,WORKER_SURNAME,CONVERT(VARCHAR(8),CONVERT(DATETIME, CHECKIN_DATE , 0), 108) as CHECKIN_DATE
        ,CONVERT(VARCHAR(8),CONVERT(DATETIME, CHECKOUT_DATE , 0), 108) as CHECKOUT_DATE
        from TSDC_USER_TABLECHECK
        where CONVERT(date,CHECKIN_DATE) = CONVERT(date,GETDATE()) 
         and  TABLE_CHECK = '${fromdata.TABLE_CHECK}'
         and WORKING_TYPE = 'Pack'
         order by CHECKIN_DATE  
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/check_historyPack', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        
     
              
        select TABLE_CHECK,PIN_CODE,USER_NAME,WORKER_NAME,WORKER_SURNAME,CONVERT(VARCHAR(8),CONVERT(DATETIME, CHECKIN_DATE , 0), 108) as CHECKIN_DATE
      
        from TSDC_USER_TABLECHECK
        where  TABLE_CHECK != '${fromdata.TABLE_CHECK}'
        and PIN_CODE = '${fromdata.PIN_CODE}'
         and WORKING_TYPE = '${fromdata.WORKING_TYPE}'
         and CHECKOUT_DATE is null
         order by CHECKIN_DATE  
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/User_checkout', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  

        update TSDC_USER_TABLECHECK
        set CHECKOUT_DATE = getdate()
        where  CONVERT(date,CHECKIN_DATE) = CONVERT(date,GETDATE()) 
            and WORKING_TYPE = 'Pack'
            and CHECKOUT_DATE is null
            and PIN_CODE = '${fromdata.PIN_CODE}'
   
     `;


        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/CheckWork_V2', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("CheckWork_V2:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        
     
            select  CONTAINER_ID , case
                        when len(CONTAINER_ID) = '20' then 'Normal'
                        when len(CONTAINER_ID) = '13' then 'Normal'
                        when len(CONTAINER_ID) < '5' then 'Online'
                        when len(CONTAINER_ID) < '10' then 'Sorter'
                        when len(CONTAINER_ID) = '10' then 'MASS'
                        when len(CONTAINER_ID) <= '17' then 'Online'
                        end WORK_TYPE
                        ,'${fromdata.USER_NAME}' as USER_NAME
                         from TSDC_PICK_CHECK_NEW
                        where CONTAINER_ID like '${fromdata.CONTAINER_ID}'
                           group by CONTAINER_ID
                       

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});


app.post('/Checkorder_block', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        
        select top 1 FNBlock_type,FTBlock_title,FTBlock_desc,hd.FTUser_update,dt.FDLastupdate from TCNM_BLOCK_ORDER_HD hd,TCNM_BLOCK_ORDER_DT dt
        where hd.FTBlock_id = dt.FTBlock_id
        and FTOrdernumber = '${fromdata.shipment_id}'
        order by dt.FDLastupdate desc
               
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});


app.post('/CheckWork', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("CheckWork :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        
     
        select distinct CONTAINER_ID ,'${fromdata.USER_NAME}' as USER_NAME,TSDC_PICK_CHECK_NEW.ORDER_TYPE,TSDC_PICK_CHECK_NEW.SHIPMENT_ID,p.COMPANY,(FORMAT(p.ORDER_DATE,'dd/MM/yyyy')) ORDER_DATE
         from TSDC_PICK_CHECK_NEW left join TSDC_PROCESS_ORDER_HEADER_TRANFER21 p on TSDC_PICK_CHECK_NEW.SHIPMENT_ID = p.SHIPMENT_ID
        where   TSDC_PICK_CHECK_NEW.shipment_id = ( select distinct shipment_id from TSDC_CONTAINER_MAPORDER
                     WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
        AND  SELLER_NO = ( select distinct SELLER_NO from TSDC_CONTAINER_MAPORDER
        WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
       
                       

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/CheckOrder_Cancel', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        
     
        select c.ORDER_NUMBER_OOC as shipment_id ,SHIPPING_NAME,TCHANNEL,c.SHOPID_OOC as SELLER_NO,c.customerid_ooc as COMPANY,(FORMAT(PO_DATE,'dd-MM-yyyy'))  as ORDER_DATE from [10.26.1.11].[TSDC_Conveyor].dbo.ONLINE_ORDER_CANCEL c
        left join TSDC_INTERFACE_ORDER_HEADER  i
        on ORDER_NUMBER_OOC =  i.PO_NO
             and c.SHOPID_OOC = i.SHIP_NO 
      where ORDER_NUMBER_OOC = ( select distinct shipment_id from TSDC_CONTAINER_MAPORDER
                     WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});



app.post('/CheckCon', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

        --test close brand 28-11-23
               SELECT  shipment_id
               ,SELLER_NO
               ,'' as USER_DEF5
               ,sum(QTY_CHECK) as SUMCHECK
               ,sum(QTY_PICK) as SUMCON
            FROM   TSDC_PICK_CHECK_NEW
            where shipment_id = ( select distinct shipment_id from TSDC_CONTAINER_MAPORDER
                               WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
            AND  SELLER_NO = ( select distinct SELLER_NO from TSDC_CONTAINER_MAPORDER
               WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
            group by shipment_id,SELLER_NO
            --,brand 
            
               --old
               --   SELECT  shipment_id
               --   ,SELLER_NO
               --   ,brand as USER_DEF5
               --   ,sum(QTY_CHECK) as SUMCHECK
               --   ,sum(QTY_PICK) as SUMCON
               --FROM   TSDC_PICK_CHECK_NEW
               --where shipment_id = ( select distinct shipment_id from TSDC_CONTAINER_MAPORDER
               --                   WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
               --AND  SELLER_NO = ( select distinct SELLER_NO from TSDC_CONTAINER_MAPORDER
               --   WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
               --group by shipment_id,SELLER_NO,brand 

            
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query,
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/CheckConOnline', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

        -- test close brand 28-11-23
        select *  from (
           SELECT  sum(QTY_CHECK) as SUMCHECK
              ,sum(QTY_PICK) as SUMCON
              ,shipment_id
              ,SELLER_NO
              ,'' as USER_DEF5
              ,customer_id as 'Owner'
              ,status_print as 'Print_Tracking'
                FROM   TSDC_PICK_CHECK_NEW A,TSDC_CONTROL_PRINT_ONLINE_TRACKING B
                WHERE SHIPMENT_ID = (select SHIPMENT_ID from TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                and SELLER_NO = (select SELLER_NO from TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                and a.SELLER_NO = b.SELLER_id
                group by  shipment_id,SELLER_NO
                --,BRAND
               ,customer_id,status_print ) as a,
           (select  SHIPPING_NAME,PO_NO,SHIP_NO,TCHANNEL from TSDC_INTERFACE_ORDER_HEADER) as c
               where  a.SHIPMENT_ID = c.PO_NO
               and a.SELLER_NO = c.SHIP_NO 

       --old 
           --select *  from (
  --         SELECT  sum(QTY_CHECK) as SUMCHECK
  --            ,sum(QTY_PICK) as SUMCON
  --            ,shipment_id
  --            ,SELLER_NO
  --            ,BRAND as USER_DEF5
           --   ,customer_id as 'Owner'
           --   ,status_print as 'Print_Tracking'
  --              FROM   TSDC_PICK_CHECK_NEW A,TSDC_CONTROL_PRINT_ONLINE_TRACKING B
  --              WHERE SHIPMENT_ID = (select SHIPMENT_ID from TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
  --              and SELLER_NO = (select SELLER_NO from TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
           --	 and a.SELLER_NO = b.SELLER_id
  --              group by  shipment_id,SELLER_NO,BRAND,customer_id,status_print ) as a,
  --         (select  SHIPPING_NAME,PO_NO,SHIP_NO,TCHANNEL from TSDC_INTERFACE_ORDER_HEADER) as c
  --             where  a.SHIPMENT_ID = c.PO_NO
  --             and a.SELLER_NO = c.SHIP_N

         --select *  from (
        --    SELECT  sum(QTY_CHECK) as SUMCHECK
        --       ,sum(QTY_PICK) as SUMCON
        --       ,shipment_id
        --       ,SELLER_NO
        --       ,BRAND as USER_DEF5
        --         FROM   TSDC_PICK_CHECK_NEW
        --         WHERE SHIPMENT_ID = (select SHIPMENT_ID from TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
        --         and SELLER_NO = (select SELLER_NO from TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
        --         group by  shipment_id,SELLER_NO,BRAND ) as a,
        --    (select  SHIPPING_NAME,PO_NO,SHIP_NO,TCHANNEL from TSDC_INTERFACE_ORDER_HEADER) as c
        --        where  a.SHIPMENT_ID = c.PO_NO
        --        and a.SELLER_NO = c.SHIP_NO 

      


            
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query,
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});


app.post('/CheckConOffline', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        select *  from (
            SELECT sum(QTY_CHECK) as SUMCHECK
               ,sum(QTY_PICK) as SUMCON
               ,shipment_id
               ,SELLER_NO
               ,BRAND as USER_DEF5
                 FROM   TSDC_PICK_CHECK_NEW
                 WHERE SHIPMENT_ID = (select SHIPMENT_ID from TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                 and SELLER_NO = (select SELLER_NO from TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                 group by  shipment_id,SELLER_NO,BRAND ) as a,
			(select BILL_NO,STORE_NO,STORE_NAME,STORE_ADDRESS,CORNER_ID_BLH,BILL_N8_BLH,(FORMAT(BILL_DATE,'dd-MM-yyyy'))  as BILL_DATE,SITE_ID_BLH,BATCH_CODE,TRANSPORT_ID,TRANSPORT_NAME
            ,BRAND_NAME,MESSAGE_1,MESSAGE_2,MESSAGE_3
			from TSDC_PICK_PRINT_SHIP_DELIVERY ) as b
                where  (a.SHIPMENT_ID = b.BILL_N8_BLH or a.SHIPMENT_ID = b.BILL_NO)
				and a.SELLER_NO = b.STORE_NO
    
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query,
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});


app.post('/CheckConSorter', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
     
        select *  from 
        (SELECT   CONTAINER_ID 
        ,sum(QTY_CHECK) as SUMCHECK
        ,sum(QTY_PICK) as SUMCON
               FROM   TSDC_PICK_CHECK_NEW
               WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}'
               group by CONTAINER_ID ) as a,


               (select  distinct RIGHT( SHIPMENT_ID, 3) AS reference_ID , CONTAINER_ID as WORK_UNIT , SHIPMENT_ID as BATCH_CODE
               , '' as [PRODUCT_BHS] ,SHIPMENT_ID as [SORTER_BATCH_NO_BHS],BRAND,ORDER_TYPE
                      FROM TSDC_PICK_CHECK_NEW
               where CONTAINER_ID = '${fromdata.CONTAINER_ID}') as b 

            where a.CONTAINER_ID = b.WORK_UNIT 

          
    
            
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/summaryCon', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
    
     select ITEM_ID
     ,QTY_REQUESTED
     ,QTY_PICK
     ,ITEM_ID_BARCODE
     ,ITEM_DESC
     ,sum(QTY_CHECK) as QTY_CHECK
     ,SHIPMENT_ID
     ,case when ORDER_TYPE = 'CANCEL' then 'CANCEL' else '' end  as ITME_CANCEL
     ,SELLER_NO
     ,BRAND
     ,UOM_PICK
     ,CASE
 WHEN sum(QTY_CHECK) <> QTY_PICK THEN '0'
 ELSE '1'
END AS STATUS_CHECK
, case when (select    max(BOX_NO_ORDER)  MaxBox_NO
     from TSDC_PICK_CHECK_BOX_CONTROL_NEW
     where PO_NO  = '${fromdata.shipment_id}'
     AND SELLER_NO = '${fromdata.SELLER_NO}'
    ) IS NULL then 0
else (select    max(BOX_NO_ORDER)  MaxBox_NO
     from TSDC_PICK_CHECK_BOX_CONTROL_NEW
     where PO_NO = '${fromdata.shipment_id}'
     AND SELLER_NO = '${fromdata.SELLER_NO}'
    )
end MaxBox_NO

     FROM TSDC_PICK_CHECK_NEW 
     where SHIPMENT_ID  = '${fromdata.shipment_id}'
     AND SELLER_NO = '${fromdata.SELLER_NO}'
     group by shipment_ID ,SELLER_NO, ITEM_ID   ,QTY_REQUESTED,ITEM_ID_BARCODE
     ,QTY_PICK ,BRAND,ITEM_DESC,UOM_PICK,ORDER_TYPE
     order by STATUS_CHECK , QTY_CHECK
      
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                        , query: query
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query
                    };
                    res.json(dataout);
                }
            }
        });
    });
});


app.post('/summaryConSorter', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
     
        select ITEM_ID
        ,ITEM_DESC
        ,QTY_REQUESTED
        ,QTY_PICK
        ,ITEM_ID_BARCODE
        ,sum(QTY_CHECK) as QTY_CHECK
        ,SHIPMENT_ID
        ,SELLER_NO
        ,BRAND
        ,UOM_PICK
        ,CASE
    WHEN QTY_CHECK <> QTY_PICK THEN '0'
    ELSE '1'
END AS STATUS_CHECK
        FROM TSDC_PICK_CHECK_NEW 
        where  CONTAINER_ID = '${fromdata.CONTAINER_ID}'
		group by shipment_ID,SELLER_NO , ITEM_ID   ,QTY_REQUESTED,ITEM_ID_BARCODE
        ,QTY_PICK , QTY_CHECK,BRAND,ITEM_DESC,UOM_PICK
        order by STATUS_CHECK , QTY_CHECK
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/matchItemInCon', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
       
        SELECT   SHIPMENT_ID
                ,ITEM_ID
                ,ITEM_DESC
				,SELLER_NO
                ,QTY_REQUESTED
                ,QTY_PICK 
                ,QTY_CHECK
				,FORMAT(TRANSACTION_DATE,'dd-MM-yyyy') as TRANSACTION_DATE
        FROM   TSDC_PICK_CHECK_NEW
        WHERE  
        
              SHIPMENT_ID = ( select SHIPMENT_ID from TSDC_CONTAINER_MAPORDER    where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
			  and SELLER_NO = ( select SELLER_NO from TSDC_CONTAINER_MAPORDER    where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'notfound'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/matchItemInConSORTER', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
       
        SELECT   SHIPMENT_ID
                ,ITEM_ID
                ,ITEM_DESC
				,SELLER_NO
                ,QTY_REQUESTED
                ,QTY_PICK 
                ,QTY_CHECK
				,FORMAT(TRANSACTION_DATE,'dd-MM-yyyy') as TRANSACTION_DATE
        FROM   TSDC_PICK_CHECK_NEW
        WHERE    CONTAINER_ID = '${fromdata.CONTAINER_ID}'
        AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'notfound'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/checkEqualCon', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        SELECT  
        ITEM_ID,
        QTY_PICK,
        (case
            when sum(QTY_CHECK) = QTY_PICK then 'equal'
            when sum(QTY_CHECK) > QTY_PICK then 'equal'
            else 'not_equal'
            end) as QTY_equal
       
FROM   TSDC_PICK_CHECK_NEW   
where SHIPMENT_ID =  (select distinct shipment_ID from TSDC_CONTAINER_MAPORDER
                    where CONTAINER_ID = '${fromdata.CONTAINER_ID}') 
AND SELLER_NO = (select distinct SELLER_NO from TSDC_CONTAINER_MAPORDER
                where CONTAINER_ID = '${fromdata.CONTAINER_ID}') 
AND  ITEM_ID_BARCODE =  '${fromdata.ITEM_ID_BARCODE}'

       group by  ITEM_ID,QTY_PICK,SHIPMENT_ID,SELLER_NO
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/checkEqualConSorter', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        SELECT  
        ITEM_ID,
        QTY_PICK,
        (case
            when sum(QTY_CHECK) = QTY_PICK then 'equal'
            when sum(QTY_CHECK) > QTY_PICK then 'equal'
            else 'not_equal'
            end) as QTY_equal
       
FROM   TSDC_PICK_CHECK_NEW   
where  CONTAINER_ID = '${fromdata.CONTAINER_ID}'
AND  ITEM_ID_BARCODE =  '${fromdata.ITEM_ID_BARCODE}'

       group by  ITEM_ID,QTY_PICK,SHIPMENT_ID,SELLER_NO
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/updateConQtyCheck', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  

        UPDATE  TSDC_PICK_CHECK_NEW
        SET		QTY_CHECK = QTY_CHECK + 1 
        ,   USER_CHECK = '${fromdata.USER_NAME}'
         , END_DATE_TIME = getdate() , 
		START_DATE_TIME = (case when QTY_CHECK = 0 then GETDATE() else START_DATE_TIME end),
        TABLE_CHECK = '${fromdata.TABLE_CHECK}'
        where   SHIPMENT_ID = (select SHIPMENT_ID from  TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
		and SELLER_NO =  (select SELLER_NO from  TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
            AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
            and QTY_CHECK < QTY_PICK
   
     `;


        query += `

     insert into [TSDC_PICK_CHECK_LOG_NEW]
     select CONTAINER_ID,ITEM_ID,QTY_CHECK,GETDATE(),'${fromdata.USER_NAME}' as USER_NAME ,SHIPMENT_ID ,'${fromdata.TABLE_CHECK}' as TABLE_CHECK,null from (
  
  select CONTAINER_ID,ITEM_ID,'1' as QTY_CHECK ,GETDATE() as DATE_TIME_STAMP,SHIPMENT_ID ,TABLE_CHECK from TSDC_PICK_CHECK_NEW
  where   CONTAINER_ID = '${fromdata.CONTAINER_ID}'
      AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
  
     ) as a
    
`;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/updateCoverSheet', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
  
        UPDATE  TSDC_PICK_CHECK_NEW
        SET	CHECK_DATE = getdate()	
        where   SHIPMENT_ID =  '${fromdata.shipment_id}'
        and SELLER_NO =  '${fromdata.SELLER_NO}';

        update TSDC_PICK_PRINT_SHIP_DELIVERY
        set CARTON_NO = '${fromdata.MaxBox_NO}'
        ,PRINT_STATUS = 'Y'
        where (BILL_N8_BLH = '${fromdata.shipment_id}' or BILL_NO = '${fromdata.shipment_id}')  
        and STORE_NO = '${fromdata.SELLER_NO}'
   
     `;


        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/updateConQtyCheck_SORTER', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  

        UPDATE  TSDC_PICK_CHECK_NEW
        SET		QTY_CHECK = QTY_CHECK + 1 
        ,   USER_CHECK = '${fromdata.USER_NAME}'
         , END_DATE_TIME = getdate() , 
		START_DATE_TIME = (case when QTY_CHECK = 0 then GETDATE() else START_DATE_TIME end),
        TABLE_CHECK = '${fromdata.TABLE_CHECK}'
        where     CONTAINER_ID = '${fromdata.CONTAINER_ID}'
        AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
        and QTY_CHECK < QTY_PICK
   
     `;


        query += `

     insert into [TSDC_PICK_CHECK_LOG_NEW]
     select CONTAINER_ID,ITEM_ID,QTY_CHECK,GETDATE(),'${fromdata.USER_NAME}' as USER_NAME ,SHIPMENT_ID ,'${fromdata.TABLE_CHECK}' as TABLE_CHECK ,nullfrom (
  
  select CONTAINER_ID,ITEM_ID,'1' as QTY_CHECK ,GETDATE() as DATE_TIME_STAMP,SHIPMENT_ID ,TABLE_CHECK from TSDC_PICK_CHECK_NEW
  where   CONTAINER_ID = '${fromdata.CONTAINER_ID}'
      AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
  
     ) as a
    
`;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});


app.post('/updateConQtyCheck_SORTER_fullcarton', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  

        UPDATE  TSDC_PICK_CHECK_NEW
        SET		QTY_CHECK = QTY_CHECK +  '${fromdata.QTY}'
        ,   USER_CHECK = '${fromdata.USER_NAME}'
         , END_DATE_TIME = getdate() , 
		START_DATE_TIME = (case when QTY_CHECK = 0 then GETDATE() else START_DATE_TIME end),
        TABLE_CHECK = '${fromdata.TABLE_CHECK}'
        where      shipment_id = ( select distinct shipment_id from TSDC_CONTAINER_MAPORDER
            WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
AND  SELLER_NO = ( select distinct SELLER_NO from TSDC_CONTAINER_MAPORDER
WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
        AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
        and QTY_CHECK < QTY_PICK
   
     `;


        query += `

     insert into [TSDC_PICK_CHECK_LOG_NEW]
     select CONTAINER_ID,ITEM_ID,QTY_CHECK,GETDATE(),'${fromdata.USER_NAME}' as USER_NAME ,SHIPMENT_ID ,'${fromdata.TABLE_CHECK}' as TABLE_CHECK,null from (
  
  select CONTAINER_ID,ITEM_ID,'${fromdata.QTY}' as QTY_CHECK ,GETDATE() as DATE_TIME_STAMP,SHIPMENT_ID ,TABLE_CHECK from TSDC_PICK_CHECK_NEW
  where   CONTAINER_ID = '${fromdata.CONTAINER_ID}'
      AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
  
     ) as a
    
`;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});


app.post('/updateConQtyCheck_fullcarton', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  

        UPDATE  TSDC_PICK_CHECK_NEW
        SET		QTY_CHECK = QTY_CHECK + '${fromdata.QTY}' 
        ,   USER_CHECK = '${fromdata.USER_NAME}' , END_DATE_TIME = getdate() , 
		START_DATE_TIME = (case when QTY_CHECK = 0 then GETDATE() else START_DATE_TIME end),
        TABLE_CHECK = '${fromdata.TABLE_CHECK}'
        where   shipment_id = ( select distinct shipment_id from TSDC_CONTAINER_MAPORDER
                    WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
        AND  SELLER_NO = ( select distinct SELLER_NO from TSDC_CONTAINER_MAPORDER
        WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')

            AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
            and QTY_CHECK < QTY_PICK
   
     `;


        query += `

     insert into [TSDC_PICK_CHECK_LOG_NEW]
     select CONTAINER_ID,ITEM_ID,QTY_CHECK,GETDATE(),'${fromdata.USER_NAME}' as USER_NAME,SHIPMENT_ID ,'${fromdata.TABLE_CHECK}' as TABLE_CHECK,null from (
  
  select CONTAINER_ID,ITEM_ID,'${fromdata.QTY}'  as QTY_CHECK ,GETDATE() as DATE_TIME_STAMP,SHIPMENT_ID ,TABLE_CHECK from TSDC_PICK_CHECK_NEW
  where   CONTAINER_ID = '${fromdata.CONTAINER_ID}'
      AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
  
     ) as a
    
`;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});


app.post('/BOX_CONTROL_DETAIL', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        select * from  TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW a
        where REF_INDEX is null
        and TABLE_CHECK = '${fromdata.TABLE_CHECK}'
        and PO_NO = '${fromdata.shipment_id}'
        AND SELLER_NO = '${fromdata.SELLER_NO}'
        and ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'     
        ${fromdata.conditiontracking || ''}
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {

                    const trackingValue = fromdata.TRACKING ? `'${fromdata.TRACKING}'` : 'NULL';
                    var query = `        
                            
                            INSERT INTO TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
                                ([REF_INDEX]
                                ,[CONTAINERID]
                                ,[PO_NO]
                                ,SELLER_NO
                                ,[BOX_NO_ORDER]
                                ,[ITEM_ID]
                                ,[QTY]
                                ,[USER_CHECK]
                                ,[TABLE_CHECK]
                                ,[ITEM_ID_BARCODE]
                                ,[Tracking]
                                )
                            VALUES
                                (NULL
                                ,'${fromdata.CONTAINER_ID}'
                                ,'${fromdata.shipment_id}'
                                ,'${fromdata.SELLER_NO}'
                                ,NULL
                                ,'${fromdata.ITEM_ID}'
                                ,1
                                ,'${fromdata.PIN_CODE}'
                                ,LTRIM(RTRIM('${fromdata.TABLE_CHECK}'))
                                ,'${fromdata.ITEM_ID_BARCODE}'
                                ,${trackingValue}
                                )

                        `;
                    return pool.request().query(query, function (err_query) {
                        if (err_query) {
                            dataout = {
                                status: 'error',
                                member: err_query,
                                query: query
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                query: query
                            };
                            res.json(dataout);
                        }
                        sql.close();
                    });

                } else {
                    var query = `
                    update TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW 
                    set QTY = QTY+1
                    from TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW a
                    where   REF_INDEX is null
                    and TABLE_CHECK = '${fromdata.TABLE_CHECK}'
                    and PO_NO = '${fromdata.shipment_id}'
                    AND SELLER_NO = '${fromdata.SELLER_NO}'
                    and ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}' 
                    and QTY < '${fromdata.check_QTY_PICK}' 
                    ${fromdata.conditiontracking || ''}
                     `;
                    return pool.request().query(query, function (err_query) {
                        if (err_query) {
                            dataout = {
                                status: 'error',
                                member: err_query,
                                query: query
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                query: query
                            };
                            res.json(dataout);
                        }
                        sql.close();
                    });
                }
            }
        });
    });
});

app.post('/BOX_CONTROL_DETAIL_FULLCARTON', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        select * from  TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
        where REF_INDEX is null
        and PO_NO = '${fromdata.shipment_id}'
        AND SELLER_NO = '${fromdata.SELLER_NO}'
        and ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'      
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {

                    var query = `        
                            
                            INSERT INTO TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
                                ([REF_INDEX]
                                ,[CONTAINERID]
                                ,[PO_NO]
                                ,SELLER_NO
                                ,[BOX_NO_ORDER]
                                ,[ITEM_ID]
                                ,[QTY]
                                ,[USER_CHECK]
                                ,[TABLE_CHECK]
                                ,[ITEM_ID_BARCODE])
                            VALUES
                                (NULL
                                ,'${fromdata.CONTAINER_ID}'
                                ,'${fromdata.shipment_id}'
                                ,'${fromdata.SELLER_NO}'
                                ,NULL
                                ,'${fromdata.ITEM_ID}'
                                ,'${fromdata.QTY}'
                                ,'${fromdata.PIN_CODE}'
                                ,'${fromdata.TABLE_CHECK}'
                                ,'${fromdata.ITEM_ID_BARCODE}')

                        `;
                    return pool.request().query(query, function (err_query) {
                        if (err_query) {
                            dataout = {
                                status: 'error insert BOX_CONTROL_detail',
                                member: err_query,
                                query: query
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                query: query
                            };
                            res.json(dataout);
                        }
                        sql.close();
                    });

                } else {
                    var query = `
                    update TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
                    set QTY = QTY+ '${fromdata.QTY}' 
                    where   REF_INDEX is null
                    and TABLE_CHECK = '${fromdata.TABLE_CHECK}'
                    and PO_NO = '${fromdata.shipment_id}'
                    AND SELLER_NO = '${fromdata.SELLER_NO}'
                    and ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}' 
                     `;
                    return pool.request().query(query, function (err_query) {
                        if (err_query) {
                            dataout = {
                                status: 'error update BOX_CONTROL_detail',
                                member: err_query,
                                query: query
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                query: query
                            };
                            res.json(dataout);
                        }
                        sql.close();
                    });
                }
            }
        });
    });
});


app.post('/check_master_box', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        select *
        from [10.26.1.11].[TSDC_Conveyor].[dbo].[TSDC_MASTER_CARTON_BOX_SIZE]
        --from TSDC_MASTER_CARTON_BOX_SIZE
        where CARTON_NAME = '${fromdata.BOX_SIZE}'
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});


app.get('/tsdc_pick_vas', function (req, res) {
    console.log("tsdc_pick_vas :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        select * from tsdc_pick_vas
        order by  vas_name asc
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/tracksum_qty', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("tracksum_qty :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        select sum(qty) as TRACKSUM_QTY,Tracking
        from TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW a
        where   REF_INDEX is null
        and PO_NO = '${fromdata.shipment_id}'
        AND SELLER_NO = '${fromdata.SELLER_NO}'
        ${fromdata.conditiontracking || ''}
        group by Tracking
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/tracking_running', function (req, res) {
    var fromdata = req.body;
    //var Datenow = DateNow();
    console.log('tracking_running');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        const trackingValue = fromdata.TRACKING ? `'${fromdata.TRACKING}'` : `''`;
        const Status = fromdata.VAS_NAME_10 ? `'${fromdata.VAS_NAME_10}'` : `''`;

        var query = `  

            declare @TABLE_RUNNING numeric(18)
            declare @BOX_NO_ORDER numeric(18)
            declare @REF_INDEX  varchar(13)
            declare @YY char(2)
            declare @MM char(2)
            declare @DD char(2)

            set @YY = (select right(YEAR(getdate()),2)) 
            set @MM = (select FORMAT(getdate(),'MM'))
            set @DD = (select FORMAT(getdate(),'dd'))
            set @TABLE_RUNNING = (SELECT CASE WHEN (SELECT MAX(TABLE_RUNNING) FROM TSDC_PICK_CHECK_BOX_CONTROL_NEW  WHERE TABLE_CHECK = '${fromdata.TABLE_CHECK}' AND SUBSTRING(REF_INDEX,4,6) = CONVERT(date,getdate())) is NULL THEN 1
                                ELSE (SELECT MAX(TABLE_RUNNING) FROM TSDC_PICK_CHECK_BOX_CONTROL_NEW  WHERE TABLE_CHECK = '${fromdata.TABLE_CHECK}' AND SUBSTRING(REF_INDEX,4,6) = CONVERT(date,getdate()) )+1
                                END TABLE_RUNNING )

            set @BOX_NO_ORDER = (SELECT CASE WHEN (SELECT MAX(BOX_NO_ORDER) FROM TSDC_PICK_CHECK_BOX_CONTROL_NEW  WHERE PO_NO = '${fromdata.shipment_id}' AND SELLER_NO = '${fromdata.SELLER_NO}') is NULL THEN 1
                                ELSE (SELECT MAX(BOX_NO_ORDER) FROM TSDC_PICK_CHECK_BOX_CONTROL_NEW  WHERE PO_NO = '${fromdata.shipment_id}' AND SELLER_NO = '${fromdata.SELLER_NO}')+1
                                END BOX_NO_ORDER )
            SET @REF_INDEX      = (SELECT  LTRIM(RTRIM('${fromdata.TABLE_CHECK}'))+@YY+@MM+@DD
                                + case WHEN @TABLE_RUNNING is NULL THEN '0001'
                                    when len(@TABLE_RUNNING) = 1 then '000'+ CONVERT(nvarchar,@TABLE_RUNNING)
                                    when len(@TABLE_RUNNING) = 2 then '00'+ CONVERT(nvarchar,@TABLE_RUNNING)
                                    when len(@TABLE_RUNNING) = 3 then '0'+ CONVERT(nvarchar,@TABLE_RUNNING)
                                    when len(@TABLE_RUNNING) = 4 then  CONVERT(nvarchar,@TABLE_RUNNING)
                                end REF_INDEX )

            insert into TSDC_PICK_CHECK_BOX_CONTROL_NEW
                ( REF_INDEX
                ,CONTAINERID
                ,PO_NO
                ,SELLER_NO
                ,QTY
                ,BOX_NO_ORDER
                ,TABLE_CHECK
                ,TABLE_RUNNING
                ,USER_CHECK
                ,BOX_SIZE
                ,WEIGHT
                ,WIDTH
                ,HIGH
                ,DEEP
                ,TRANSPORT
                ,TRACKING
                ,SORTCODE
                ,SORTINGLINECODE
                ,STORENAME
                ,CUST_NAME
                ,CUST_ADDRESS
                ,CUST_TEL
                ,PICKUP_DATE
                ,PRINT_DATE
                ,CREATE_DATE
                ,REPRINT_DATE
                ,CODTYPE
                ,CODTOTAL
                ,VAS_NAME_01
                ,VAS_NAME_02
                ,VAS_NAME_03
                ,VAS_NAME_04
                ,VAS_NAME_05
                ,VAS_NAME_06
                ,VAS_NAME_07
                ,VAS_NAME_08
                ,VAS_NAME_09
                ,VAS_NAME_10
                )
                select 
                @REF_INDEX 
                ,'${fromdata.CONTAINER_ID}'
                ,'${fromdata.shipment_id}'
                ,'${fromdata.SELLER_NO}'
                ,sum(QTY) AS QTY
                , @BOX_NO_ORDER 
                ,LTRIM(RTRIM('${fromdata.TABLE_CHECK}'))
                ,@TABLE_RUNNING
                ,'${fromdata.PIN_CODE}'
                ,'${fromdata.BOX_SIZE}'
                ,${fromdata.CARTON_BOX_WEIGHT}
                ,${fromdata.CARTON_BOX_W}
                ,${fromdata.CARTON_BOX_H}
                ,${fromdata.CARTON_BOX_L}
                ,''
                ,${trackingValue}
                ,''
                ,''
                ,''
                ,'${fromdata.SHIPPING_NAME}'
                ,''
                ,''
                ,getdate()
                ,getdate()
                ,getdate()
                ,getdate()
                ,'N'
                ,0
                ,'${fromdata.VAS_NAME_01}'
                ,'${fromdata.VAS_NAME_02}'
                ,'${fromdata.VAS_NAME_03}'
                ,'${fromdata.VAS_NAME_04}'
                ,'${fromdata.VAS_NAME_05}'
                ,'${fromdata.VAS_NAME_06}'
                ,'${fromdata.VAS_NAME_07}'
                ,'${fromdata.VAS_NAME_08}'
                ,'${fromdata.VAS_NAME_09}'
                ,${Status}
            from 	 TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
            where REF_INDEX is null
            and PO_NO = '${fromdata.shipment_id}'
            AND SELLER_NO = '${fromdata.SELLER_NO}'
     `;


        query += `
                    UPDATE TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW 
                    SET    REF_INDEX = @REF_INDEX,
                           BOX_NO_ORDER = @BOX_NO_ORDER,
                          BOX_SIZE = '${fromdata.BOX_SIZE}'
                    from TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW a
                    where  REF_INDEX is null
                    and PO_NO = '${fromdata.shipment_id}'
                  AND SELLER_NO = '${fromdata.SELLER_NO}'
                    ${fromdata.conditiontracking || ''}
                    

                    
    
`;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var query2 = `        

                select REF_INDEX
                        ,QTY
                        ,PO_NO
                        ,SELLER_NO
                        ,BOX_NO_ORDER
                        ,BILL_NO_REF
                from  TSDC_PICK_CHECK_BOX_CONTROL_NEW
                where TABLE_CHECK = '${fromdata.TABLE_CHECK}'
                and PO_NO = '${fromdata.shipment_id}'
                AND SELLER_NO = '${fromdata.SELLER_NO}'
                    and REF_INDEX = (select max(REF_INDEX) as REF_INDEX
                                from  TSDC_PICK_CHECK_BOX_CONTROL_NEW
                                where TABLE_CHECK = '${fromdata.TABLE_CHECK}'
                                and PO_NO = '${fromdata.shipment_id}'
                                AND SELLER_NO = '${fromdata.SELLER_NO}')
                
               `;
                return pool.request().query(query2, function (err_query, recordset) {
                    if (err_query) {
                        dataout = {
                            status: 'error',
                            member: err_query,
                            query: query2,
                        };
                        res.json(dataout);
                    } else {
                        var data = recordset.recordset;
                        if (recordset.recordset.length === 0) {
                            dataout = {
                                status: 'null'
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                data: data,
                                query: query
                            };
                            res.json(dataout);
                        }
                    }
                });
            }
            sql.close();
        });
    });
});





app.post('/loadTracking', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

        select *,(select    max(BOX_NO_ORDER)  MaxBox_NO
        from TSDC_PICK_CHECK_BOX_CONTROL_NEW
        where PO_NO  = '${fromdata.shipment_id}'
        AND SELLER_NO = '${fromdata.SELLER_NO}') as MaxBox_NO
         from TSDC_PICK_CHECK_BOX_CONTROL_NEW a
        where po_no = '${fromdata.shipment_id}'
        and SELLER_NO =  '${fromdata.SELLER_NO}' ${fromdata.conditiontracking || ''}
        order by CREATE_DATE 
               

            
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query,
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/summary_ITEM_LACK', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("summary_ITEM_LACK :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

       
            select ITEM_ID
            ,QTY_REQUESTED
            ,QTY_PICK
            ,sum(QTY_CHECK) as QTY_CHECK
            ,(QTY_PICK -sum(QTY_CHECK)) as QTY_LACK
            ,a.SHIPMENT_ID
            ,(FORMAT(GETDATE(),'dd-MM-yyyy ') 
            + CONVERT(VARCHAR(5),CONVERT(DATETIME, GETDATE() , 0), 108) )as TO_DAY
            ,STORE_NO
            ,STORE_NAME
            ,(FORMAT(BILL_DATE,'dd-MM-yyyy'))  as ORDER_DATE
            FROM TSDC_PICK_CHECK_NEW  a , TSDC_PICK_PRINT_SHIP_DELIVERY b
            where a.SHIPMENT_ID = '${fromdata.shipment_id}' 
            and SELLER_NO  =   '${fromdata.SELLER_NO}' 
            and (a.SHIPMENT_ID = b.BILL_N8_BLH or a.SHIPMENT_ID = b.BILL_NO)
            and a.SELLER_NO = b.STORE_NO
            group by a.shipment_ID , ITEM_ID   ,QTY_REQUESTED ,QTY_PICK ,STORE_NO
            ,STORE_NAME
            ,BILL_DATE
            HAVING (sum(QTY_CHECK) - QTY_PICK) <> '0'
                
    
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        data: err_query
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/CheckCon_Orderconfirm', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("CheckCon_Orderconfirm :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

        select *  from (
            SELECT  sum(QTY_CHECK) as SUMCHECK
               ,sum(QTY_PICK) as SUMCON
               ,shipment_id
               ,SELLER_NO
               ,BRAND as USER_DEF5
                 FROM   TSDC_PICK_CHECK_NEW
                 WHERE SHIPMENT_ID = (select SHIPMENT_ID from TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                 and SELLER_NO = (select SELLER_NO from TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                 group by  shipment_id,SELLER_NO,BRAND ) as a,
			(select BILL_NO,STORE_NO,STORE_NAME,STORE_ADDRESS,CORNER_ID_BLH,BILL_N8_BLH,(FORMAT(BILL_DATE,'dd-MM-yyyy'))  as BILL_DATE,SITE_ID_BLH,BATCH_CODE,TRANSPORT_ID,TRANSPORT_NAME
            ,BRAND_NAME,MESSAGE_1,MESSAGE_2,MESSAGE_3
			from TSDC_PICK_PRINT_SHIP_DELIVERY ) as b
			,(
				select SHIPMENT_ID as SHIPMENT_ID_STS, 'S' as STATUS_DATA,SHIP_TO from TSDC_PICK_CHECK_CONFIRM_ORDER
			 where SHIPMENT_ID in  (
			 select distinct SHIPMENT_ID
				FROM TSDC_PICK_CHECK_NEW
			 where CONTAINER_ID = '${fromdata.CONTAINER_ID}'
			 )

			 union all 

			  select 
			 SHIPMENT_ID as  SHIPMENT_ID_STS, 'N' as STATUS_DATA,SHIP_TO
			 from TSDC_PROCESS_ORDER_HEADER_ORDERPICK_PRINT  a
			  where shipment_id in  (
			 select distinct SHIPMENT_ID
				FROM TSDC_PICK_CHECK_NEW
			 where CONTAINER_ID = '${fromdata.CONTAINER_ID}'
			 )
				  and not exists (
			 select * from  TSDC_PICK_CHECK_CONFIRM_ORDER b
			 where a.SHIPMENT_ID = b.SHIPMENT_ID
			 )
			 ) as c
    where  (a.SHIPMENT_ID = b.BILL_N8_BLH or a.SHIPMENT_ID = b.BILL_NO)
	and a.SELLER_NO = b.STORE_NO
	and   C.SHIPMENT_ID_STS = a.SHIPMENT_ID
	and c.SHIP_TO = b.STORE_NO 
				

            
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query,
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/Rescan_checkitem', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('Rescan_checkitem');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        update TSDC_PICK_CHECK_NEW
        set QTY_CHECK = CASE 
               WHEN QTY_CHECK - QTY < 0 THEN 0
               ELSE QTY_CHECK - QTY
               END
        ,USER_CHECK = NULL
        ,CHECK_DATE = NULL
        ,START_DATE_TIME = NULL
        ,END_DATE_TIME = NULL
        ,TABLE_CHECK = NULL
         from TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW a,TSDC_PICK_CHECK_NEW b
         where   REF_INDEX is null
         and PO_NO = '${fromdata.shipment_id}'
         AND a.SELLER_NO = '${fromdata.SELLER_NO}'
         and a.PO_NO = b.SHIPMENT_ID 
         AND a.SELLER_NO = B.SELLER_NO
         AND a.ITEM_ID = B.ITEM_ID;

     `;

        query += `
        delete TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
        where   REF_INDEX is null
        and PO_NO = '${fromdata.shipment_id}'
        AND SELLER_NO = '${fromdata.SELLER_NO}';
     `;




        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});



app.post('/checkstatusUpdateConfirmOrder', function (req, res) {
    var fromdata = req.body;
    console.log("checkstatusUpdateConfirmOrder:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select * from TSDC_PICK_CHECK_CONFIRM_ORDER
            where SHIPMENT_ID in (
            select distinct SHIPMENT_ID from TSDC_PICK_CHECK_NEW
            where CONTAINER_ID = '${fromdata.CONTAINER_ID}'
            )
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});


app.post('/UpdateConfirmOrder', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('UpdateConfirmOrder');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        UPDATE  TSDC_PICK_CHECK_NEW
        SET 	CHECK_DATE = GETDATE()
        WHERE	
                 SHIPMENT_ID = '${fromdata.shipment_id}'
				 and SELLER_NO = '${fromdata.SELLER_NO}'
     
        `;

        query += `

        UPDATE TSDC_PROCESS_ORDER_DETAIL_ORDERPICK_PRINT
        SET TOTAL_QTY = t.QTY_CHECK
        FROM TSDC_PROCESS_ORDER_DETAIL_ORDERPICK_PRINT AS p
        INNER JOIN
            (
                SELECT SHIPMENT_ID,ITEM_ID, SUM(QTY_CHECK) as QTY_CHECK
                FROM TSDC_PICK_CHECK_NEW
                WHERE  SHIPMENT_ID in ('${fromdata.shipment_id}')
                and SELLER_NO = '${fromdata.SELLER_NO}'
                GROUP BY ITEM_ID , SHIPMENT_ID
            ) t
            ON t.SHIPMENT_ID = p.INTERFACE_LINK_ID
            and t.ITEM_ID = p.ITEM
`;



        query += `
        insert into  TSDC_PICK_CHECK_CONFIRM_ORDER
  select 
			   [COMPANY],
			   [WAREHOUSE], [SHIPMENT_ID], [ORDER_TYPE], [SHIP_TO], [SHIP_TO_NAME],
			   [SHIP_TO_ADDRESS1], [SHIP_TO_STATE], [SHIP_TO_CITY], [SHIP_TO_COUNTRY],
			   [SHIP_TO_POSTAL_CODE], [USER_STAMP], [ROUTE], [DATE_TIME_STAMP],
			   [USER_DEF1], [USER_DEF2], [USER_DEF3], [USER_DEF4],
			   [USER_DEF5], [USER_DEF6], [USER_DEF7], [ORDER_DATE] 
			   , '${fromdata.USER_NAME}'
			   ,'${fromdata.TABLE_CHECK}'
			    , GETDATE() 
			   from TSDC_PROCESS_ORDER_HEADER_ORDERPICK_PRINT a
               where SHIPMENT_ID = '${fromdata.shipment_id}'
			   and SHIP_TO = '${fromdata.SELLER_NO}'
		and not exists (
			   select * from TSDC_PICK_CHECK_CONFIRM_ORDER b
			   where a.SHIPMENT_ID = b.SHIPMENT_ID
			   );

    insert into  [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_PICK_CHECK_CONFIRM_ORDER
    select 
			   [COMPANY],
			   [WAREHOUSE], [SHIPMENT_ID], [ORDER_TYPE], [SHIP_TO], [SHIP_TO_NAME],
			   [SHIP_TO_ADDRESS1], [SHIP_TO_STATE], [SHIP_TO_CITY], [SHIP_TO_COUNTRY],
			   [SHIP_TO_POSTAL_CODE], [USER_STAMP], [ROUTE], [DATE_TIME_STAMP],
			   [USER_DEF1], [USER_DEF2], [USER_DEF3], [USER_DEF4],
			   [USER_DEF5], [USER_DEF6], [USER_DEF7], [ORDER_DATE] 
			   , '${fromdata.USER_NAME}'
			   ,'${fromdata.TABLE_CHECK}'
			    , GETDATE() 
			   from TSDC_PROCESS_ORDER_HEADER_ORDERPICK_PRINT a
               where SHIPMENT_ID = '${fromdata.shipment_id}'
			   and SHIP_TO = '${fromdata.SELLER_NO}'
		and not exists (
			   select * from TSDC_PICK_CHECK_CONFIRM_ORDER b
			   where a.SHIPMENT_ID = b.SHIPMENT_ID
			   ); 

    
`;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});


app.post('/Rescancheckitem_all', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('Rescancheckitem_all');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        UPDATE  TSDC_PICK_CHECK_NEW
        SET 	QTY_CHECK = 0
        WHERE	CONTAINER_ID = '${fromdata.CONTAINER_ID}'
        and ORDER_TYPE = 'SORTER'

     
        `;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/UpdateCheckdate', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('UpdateCheckdate');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        UPDATE  TSDC_PICK_CHECK_NEW
        SET 	CHECK_DATE = GETDATE()
        WHERE	
                 SHIPMENT_ID = '${fromdata.shipment_id}'
				 and SELLER_NO = '${fromdata.SELLER_NO}'
                 and CHECK_DATE is null
     
        `;



        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});


app.post('/ReprintTracking', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("ReprintTracking :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

        update TSDC_PICK_CHECK_BOX_CONTROL_NEW
        set REPRINT_DATE = getdate()
        where REF_INDEX = '${fromdata.REF_INDEX}'
        and PO_NO = '${fromdata.PO_NO}'
        AND SELLER_NO = '${fromdata.SELLER_NO}' ; 

        select REF_INDEX
        ,QTY
        ,PO_NO
        ,SELLER_NO
        ,BOX_NO_ORDER
        ,BOX_SIZE
		,TABLE_CHECK
        ,BILL_NO_REF
        from  TSDC_PICK_CHECK_BOX_CONTROL_NEW
        where REF_INDEX = '${fromdata.REF_INDEX}'
        and PO_NO = '${fromdata.PO_NO}'
        AND SELLER_NO = '${fromdata.SELLER_NO}'
            

            
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query,
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/ReprintTrackingAll', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("ReprintTrackingAll :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

        select REF_INDEX
        ,QTY
        ,PO_NO
        ,SELLER_NO
        ,BOX_NO_ORDER
        ,BOX_SIZE
		,TABLE_CHECK
        ,BILL_NO_REF
        from  TSDC_PICK_CHECK_BOX_CONTROL_NEW
        where CONTAINERID = '${fromdata.CONTAINER_ID}'
            
            
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query,
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/UpdateCheckdateSorter', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('UpdateCheckdateSorter');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        UPDATE  TSDC_PICK_CHECK_NEW
        SET 	CHECK_DATE = GETDATE()
        WHERE	
        SHIPMENT_ID = '${fromdata.shipment_id}'
		and  CONTAINER_ID = '${fromdata.CONTAINER_ID}'
     
        `;



        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});



app.get('/outstanding_online', function (req, res) {
    var fromdata = req.body;
    console.log("outstanding_online:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select CONVERT(varchar,transaction_date,103)Date,SHIPMENT_ID,SELLER_NO,BRAND,sum(QTY_REQUESTED)- sum(QTY_CHECK)QTY
            from TSDC_PICK_CHECK_NEW
            where ORDER_TYPE = 'online'
            and CHECK_DATE is null
            and TRANSACTION_DATE >= '2021-11-23'
            group by transaction_date,SHIPMENT_ID,SELLER_NO,BRAND
            order by SHIPMENT_ID
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});


app.get('/outstanding_offline', function (req, res) {
    var fromdata = req.body;
    console.log("outstanding_offline:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select CONVERT(varchar,transaction_date,103)Date,SHIPMENT_ID,SELLER_NO,BRAND,sum(QTY_REQUESTED)- sum(QTY_CHECK)QTY
            from TSDC_PICK_CHECK_NEW
            where ORDER_TYPE = 'offline'
            and CHECK_DATE is null
            and TRANSACTION_DATE >= '2021-11-23'
            group by transaction_date,SHIPMENT_ID,SELLER_NO,BRAND
            order by SHIPMENT_ID
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});



app.get('/outstanding_sorter', function (req, res) {
    var fromdata = req.body;
    console.log("outstanding_sorter:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select CONVERT(varchar,transaction_date,103)Date,SHIPMENT_ID,CONTAINER_ID,BRAND,sum(QTY_REQUESTED)- sum(QTY_CHECK)QTY
            from TSDC_PICK_CHECK_NEW
            where ORDER_TYPE = 'sorter'
            and CHECK_DATE is null
            and TRANSACTION_DATE >= '2021-11-23'
            group by transaction_date,SHIPMENT_ID,SELLER_NO,BRAND,CONTAINER_ID
            order by SHIPMENT_ID
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});


app.get('/outstanding_CfOrder', function (req, res) {
    var fromdata = req.body;
    console.log("outstanding_CfOrder:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select CONVERT(varchar,transaction_date,103)Date,SHIPMENT_ID,BRAND,sum(QTY_REQUESTED)- sum(QTY_CHECK)QTY
            from TSDC_PICK_CHECK_NEW
            where ORDER_TYPE = 'Cf_order'
            and CHECK_DATE is null
            and TRANSACTION_DATE >= '2021-11-23'
            group by transaction_date,SHIPMENT_ID,SELLER_NO,BRAND
            order by SHIPMENT_ID
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});



app.get('/percent_online', function (req, res) {
    var fromdata = req.body;
    console.log("percent_online:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select case when  bill_check = 0 or bill_all = 0 then 0
             when CONVERT(int, round( bill_check/bill_all*100,0)) is null then 0
			else CONVERT(int, round( bill_check/bill_all*100,0))
    end P_online
            from
            (
            select count(SHIPMENT_ID+SELLER_NO) as bill_check  from TSDC_PICK_CHECK_NEW
            where TRANSACTION_DATE >= '2021-11-23'
            and ORDER_TYPE = 'online'
            and CHECK_DATE is not  null  
            )as _check,
            (
            select count(SHIPMENT_ID+SELLER_NO) as bill_all from TSDC_PICK_CHECK_NEW 
            where TRANSACTION_DATE >= '2021-11-23'
			and  TRANSACTION_DATE <= getdate()
            and ORDER_TYPE = 'online'
            )as _REQUESTED

    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.get('/percent_offline', function (req, res) {
    var fromdata = req.body;
    console.log("percent_offline:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select case when  bill_check = 0 or bill_all = 0 then 0
             when CONVERT(int, round( bill_check/bill_all*100,0)) is null then 0
			else CONVERT(int, round( bill_check/bill_all*100,0))
    end P_offline
            from
            (
            select count(SHIPMENT_ID+SELLER_NO) as bill_check  from TSDC_PICK_CHECK_NEW
            where TRANSACTION_DATE >= '2021-11-23'
            and ORDER_TYPE = 'offline'
            and CHECK_DATE is not  null  
            )as _check,
            (
            select count(SHIPMENT_ID+SELLER_NO) as bill_all from TSDC_PICK_CHECK_NEW 
            where TRANSACTION_DATE >= '2021-11-23'
			and  TRANSACTION_DATE <= getdate()
            and ORDER_TYPE = 'offline'
            )as _REQUESTED
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.get('/percent_sorter', function (req, res) {
    var fromdata = req.body;
    console.log("percent_sorter:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select case  when  bill_check = 0 or bill_all = 0 then 0
            when CONVERT(int, round( bill_check/bill_all*100,0)) is null then 0
			else CONVERT(int, round( bill_check/bill_all*100,0))
    end P_sorter
            from
            (
            select count(SHIPMENT_ID+SELLER_NO) as bill_check  from TSDC_PICK_CHECK_NEW
            where TRANSACTION_DATE >= '2021-11-23'
            and ORDER_TYPE = 'sorter'
            and CHECK_DATE is not  null  
            )as _check,
            (
            select count(SHIPMENT_ID+SELLER_NO) as bill_all from TSDC_PICK_CHECK_NEW 
            where TRANSACTION_DATE >= '2021-11-23'
			and  TRANSACTION_DATE <= getdate()
            and ORDER_TYPE = 'sorter'
            )as _REQUESTED
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.get('/percent_CForder', function (req, res) {
    var fromdata = req.body;
    console.log("percent_CForder:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select case  when  bill_check = 0 or bill_all = 0 then 0
            when CONVERT(int, round( bill_check/bill_all*100,0)) is null then 0
			else CONVERT(int, round( bill_check/bill_all*100,0))
    end P_CF_ORDER
            from
            (
            select count(SHIPMENT_ID+SELLER_NO) as bill_check  from TSDC_PICK_CHECK_NEW
            where TRANSACTION_DATE >= '2021-11-23'
            and ORDER_TYPE = 'CF_ORDER'
            and CHECK_DATE is not  null  
            )as _check,
            (
            select count(SHIPMENT_ID+SELLER_NO) as bill_all from TSDC_PICK_CHECK_NEW 
            where TRANSACTION_DATE >= '2021-11-23'
			and  TRANSACTION_DATE <= getdate()
            and ORDER_TYPE = 'CF_ORDER'
            )as _REQUESTED
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.get('/Order_disappear', function (req, res) {
    var fromdata = req.body;
    console.log("Order_disappear:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
        select SHIPMENT_ID,SELLER_NO,BRAND,ORDER_TYPE,sum(QTY_REQUESTED)-sum(QTY_CHECK) QTY from TSDC_PICK_CHECK_NEW
        where shipment_id in ( select distinct shipment_id from TSDC_PICK_CHECK_NEW where  CHECK_DATE is not null
        and QTY_REQUESTED != QTY_CHECK)
        and CONVERT(date,CHECK_DATE) = CONVERT(date,getdate())
        group by SHIPMENT_ID,SELLER_NO,BRAND,ORDER_TYPE

    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});


app.post('/Order_disappear_detail', function (req, res) {
    var fromdata = req.body;
    console.log("Order_disappear:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
        select SHIPMENT_ID,SELLER_NO,ITEM_ID,QTY_REQUESTED,QTY_CHECK from TSDC_PICK_CHECK_NEW
        where SHIPMENT_ID = '${fromdata.SHIPMENT_ID}'
        and SELLER_NO = '${fromdata.SELLER_NO}'
        and QTY_REQUESTED != QTY_CHECK
        order by ITEM_ID
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.post('/CheckTrack', function (req, res) {
    var fromdata = req.body;
    console.log("CheckTrack:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
        select BOX_SIZE,REF_INDEX,a.PO_NO,SELLER_NO,QTY,BOX_NO_ORDER,TABLE_CHECK,CUST_NAME ,TCHANNEL,p.COMPANY, (FORMAT(ORDER_DATE,'dd-MM-yyyy')) ORDER_DATE,BILL_NO_REF
        from TSDC_PICK_CHECK_BOX_CONTROL_NEW a left join TSDC_PROCESS_ORDER_HEADER_TRANFER21 p on a.PO_NO = p.SHIPMENT_ID ,
        (select  SHIPPING_NAME,PO_NO,SHIP_NO,TCHANNEL from TSDC_INTERFACE_ORDER_HEADER) as c
            where  a.PO_NO = c.PO_NO
            and a.SELLER_NO = c.SHIP_NO 
        and REF_INDEX = '${fromdata.REF_INDEX}'
        
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    var query = `
                    select BOX_SIZE,REF_INDEX,PO_NO,SELLER_NO,QTY,BOX_NO_ORDER,TABLE_CHECK,CUST_NAME,'Offline' as TCHANNEL
                    from TSDC_PICK_CHECK_BOX_CONTROL_NEW 
                    where REF_INDEX = '${fromdata.REF_INDEX}'
                       `;
                    return pool.request().query(query, function (err_query, recordset) {
                        if (err_query) {
                            dataout = {
                                status: 'error',
                                data: err_query,
                                query: query,
                            };
                            res.json(dataout);
                        } else {
                            var data = recordset.recordset;
                            if (recordset.recordset.length === 0) {
                                dataout = {
                                    status: 'null',
                                    query: query,
                                };
                                res.json(dataout);
                            } else {
                                dataout = {
                                    status: 'success',
                                    data: data,
                                    query: query,
                                };
                                res.json(dataout);
                            }
                        }
                    });
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});


app.post('/updateBoxTracking', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('updateBoxTracking');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        INSERT INTO LOG_EDITBOX_TRACKING
        VALUES ('${fromdata.REF_INDEX}'
                ,'${fromdata.BEFORE_BOX_SIZE}'
                ,'${fromdata.BOX_SIZE}'
                ,'${fromdata.USER_NAME}'
                ,GETDATE() 
                );

        UPDATE  TSDC_PICK_CHECK_BOX_CONTROL_NEW
        SET	BOX_SIZE = '${fromdata.BOX_SIZE}'	
        ,WEIGHT = ${fromdata.CARTON_BOX_WEIGHT}
        ,WIDTH = ${fromdata.CARTON_BOX_W}
        ,HIGH = ${fromdata.CARTON_BOX_H}
        ,DEEP = ${fromdata.CARTON_BOX_L}
        ,REPRINT_DATE = getdate()
        where   REF_INDEX =  '${fromdata.REF_INDEX}';

        UPDATE  TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
        SET	BOX_SIZE = '${fromdata.BOX_SIZE}'	
        where   REF_INDEX =  '${fromdata.REF_INDEX}';

     `;
        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var query2 =
                    `
                    select BOX_SIZE,REF_INDEX,PO_NO,SELLER_NO,QTY,BOX_NO_ORDER,TABLE_CHECK,CUST_NAME,BILL_NO_REF
                    from TSDC_PICK_CHECK_BOX_CONTROL_NEW 
                    where REF_INDEX = '${fromdata.REF_INDEX}'
                     `;
                return pool.request().query(query2, function (err_query2, recordset) {
                    if (err_query2) {
                        dataout = {
                            status: 'error',
                            data: err_query2,
                            query: query2,
                        };
                        res.json(dataout);
                    } else {
                        var data = recordset.recordset;
                        if (recordset.recordset.length === 0) {
                            dataout = {
                                status: 'null',
                                query: query,
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                data: data,

                            };
                            res.json(dataout);
                        }
                    }
                });
            }
            sql.close();
        });
    });
});

app.post('/pickcheck_print_ordercancel', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        INSERT INTO [TSDC_PICK_CHECK_PRINTCANCEL]
        ( container_id
        ,shipment_id
        ,user_check
        ,table_check
        ,zone
        ,print_date
        )
        VALUES ('${fromdata.CONTAINER_ID}'
                ,'${fromdata.shipment_id}'
                ,'${fromdata.USER_NAME}'
                ,'${fromdata.TABLE_CHECK}'
                ,'${fromdata.Zone}'
                ,GETDATE() 
                );
     `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var query2 =
                    `
                select top 1 *
                from TSDC_PICK_CHECK_PRINTCANCEL
                where shipment_id = '${fromdata.shipment_id}'
                and table_check = '${fromdata.TABLE_CHECK}'
                order by print_date desc
                 `;
                return pool.request().query(query2, function (err_query2, recordset) {
                    if (err_query2) {
                        dataout = {
                            status: 'error',
                            data: err_query2,
                            query: query2,
                        };
                        res.json(dataout);
                    } else {
                        var data = recordset.recordset;
                        if (recordset.recordset.length === 0) {
                            dataout = {
                                status: 'null',
                                query: query,
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                data: data,

                            };
                            res.json(dataout);
                        }
                    }
                });
            }
            sql.close();
        });
    });
});

app.get('/get_table_printcancel', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        
        select distinct table_check from TSDC_PICK_CHECK_printcancel order by table_check 
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/get_report_printcancel', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        const condition_zone = fromdata.zone
            ? ` AND zone = '${fromdata.zone}' `
            : '';

        const condition_tablecheck = fromdata.tablecheck
            ? ` AND table_check = '${fromdata.tablecheck}' `
            : '';

        const fromDateTime = `${fromdata.printDate} ${fromdata.timeFrom}:00`;
        const toDateTime = `${fromdata.printDate} ${fromdata.timeTo}:59`;

        var query = `        
        select  CONVERT(VARCHAR(10), print_date, 103) + ' ' +
        LEFT(CONVERT(VARCHAR(8), print_date, 108), 5) 
        AS print_datetime,* from TSDC_PICK_CHECK_printcancel
        WHERE print_date BETWEEN '${fromDateTime}' AND '${toDateTime}'
        ${condition_zone} ${condition_tablecheck}
        order by print_date 

        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});
///////////////////////// outbound check tracking ////////////////
app.post('/check_Pallet_confirm_outbound', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("check_Pallet_confirm_outbound");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = ` 
        select IDENTITY(INT,1,1) AS ID,
                CREATE_DATE AS CREATE_DATE
                ,PALLET_NO,QTY_BOX,BILL_NO,
                SHIP_PROVIDER_OOD,TCHANNEL
                ,ORDER_NO
                        INTO #temp_NewTable 
                        from TSDC_CONFIRM_OUTBOUND
                        where PALLET_NO  = '${fromdata.Pallet_NO}'
                        and CONVERT(date,CREATE_DATE) = CONVERT(date,getdate()) 
                        group by PALLET_NO,CREATE_DATE,QTY_BOX,BILL_NO,
                        SHIP_PROVIDER_OOD,TCHANNEL,ORDER_NO
                        order by CREATE_DATE desc

                        
                        select *,format (CREATE_DATE ,'yyyy-MM-dd hh:mm:ss') as scandate,(select count(*)from #temp_NewTable ) as count_qty
                        from #temp_NewTable
                        
        `
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'NULL'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.post('/check_Pallet_confirm_outbound11', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = ` 
        select top 1*
        from [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_CONFIRM_OUTBOUND
        where PALLET_NO  = '${fromdata.Pallet_NO}'
        and CONVERT(date,CREATE_DATE) = CONVERT(date,getdate()) 
        and driver_name is not null
                        
        `
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'NULL'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.post('/check_Tracking_Order_Cancel', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = ` 
        select top 1*
        from TSDC_OUTBOUND_ORDER_CANCEL
        where TRACK_NO  = '${fromdata.TRACK_CODE}'
                        
        `
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'NULL'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.post('/check_Tracking_confirm_outbound2', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("check_Tracking_confirm_outbound");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = ` 
        
        SELECT  PO_NO  FROM [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_CHECK_ORDERONLINE_OUTBOUNT 
        where PO_NO  = '${fromdata.TRACK_CODE}'
        `


        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    var query2 = `
                    SELECT CONVERT(varchar,CREATE_DATE,121) as scandate,* FROM TSDC_CONFIRM_OUTBOUND 
                    where Bill_no = '${fromdata.TRACK_CODE}'
                    order by CREATE_DATE desc
                    `

                    return pool.request().query(query2, function (err_query, recordset) {
                        if (err_query) {
                            dataout = {
                                status: 'error2',
                                data: err_query
                            };
                            res.json(dataout);
                        } else {
                            var data = recordset.recordset;
                            if (recordset.recordset.length === 0) {
                                dataout = {
                                    status: 'null',
                                    query: query
                                };
                                res.json(dataout);
                            } else {
                                dataout = {
                                    status: 'warning_Track',
                                    data: data,
                                };
                                res.json(dataout);
                            }

                        }
                        sql.close();
                    });
                } else {
                    dataout = {
                        status: 'warning_PO',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});


app.post('/insertTracking_confirmOutbound', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("insertTracking_confirmOutbound:" + fromdata.item);
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        insert into TSDC_CONFIRM_OUTBOUND 
        (   [BILL_NO], 
			PALLET_NO,
            [QTY_BOX], 
            [CREATE_DATE],
            [PIN_ID],
            [INTERNAL_ID],
            USER_CONFIRM_DELIVERY,
			DATE_DELIVERY,
            STATUS_DELIVERY,
           [STATUS],
            SHIP_PROVIDER_OOD,
            ORDER_NO,
            TCHANNEL

        )
        VALUES
        (
        '${fromdata.TRACK_CODE}'
        ,'${fromdata.Pallet_NO}'
      ,'1'
      ,GETDATE()
      , '${fromdata.PIN_ID}' 
      ,'${fromdata.INTERNAL_ID}'
      ,null
      ,''
      ,'N'
      ,'N'
      ,'${fromdata.SHIP_PROVIDER_OOD}',
      (select distinct ORDER_NUMBER_OOD from ONLINE_ORDER_DETAIL where TRACK_CODE_OOD = '${fromdata.TRACK_CODE}'),
      (Select distinct B.PARTNERNAME from ONLINE_ORDER_DETAIL A,  ONLINE_CUSTOMER_PARTNER B Where A.SHOPID_OOD = B.SHOPID
        and A.TRACK_CODE_OOD = '${fromdata.TRACK_CODE}')
        );
        `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                console.log(1)
                dataout = {
                    status: 'error1',
                    data: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                query2 = `
               
                
                -- select IDENTITY(INT,1,1) AS ID,
                -- CREATE_DATE AS CREATE_DATE
                -- ,PALLET_NO,QTY_BOX,BILL_NO,
                -- SHIP_PROVIDER_OOD,TCHANNEL
                -- ,ORDER_NO
                --         INTO #temp_NewTable 
                --         from TSDC_CONFIRM_OUTBOUND
                --         where PALLET_NO  = '${fromdata.Pallet_NO}'
                --         and CONVERT(date,CREATE_DATE) = CONVERT(date,getdate()) 
                --         group by PALLET_NO,CREATE_DATE,QTY_BOX,BILL_NO,
                --         SHIP_PROVIDER_OOD,TCHANNEL,ORDER_NO
                --         order by CREATE_DATE desc

                        
                --         select *,format ( CREATE_DATE ,'yyyy-MM-dd hh:mm:ss') as scandate,(select count(*)from #temp_NewTable ) as count_qty
                --         from #temp_NewTable

                select
                format ( CREATE_DATE ,'yyyy-MM-dd hh:mm:ss') as scandate
                ,PALLET_NO,QTY_BOX,BILL_NO,
                SHIP_PROVIDER_OOD,TCHANNEL
                ,ORDER_NO
				,(select sum(QTY_BOX) 
                        from TSDC_CONFIRM_OUTBOUND
                        where PALLET_NO  = '${fromdata.Pallet_NO}'
                        and CONVERT(date,CREATE_DATE) = CONVERT(date,getdate()) 
						) as count_qty

					from TSDC_CONFIRM_OUTBOUND
                        where PALLET_NO  = '${fromdata.Pallet_NO}'
                        and CONVERT(date,CREATE_DATE) = CONVERT(date,getdate()) 
                        order by CREATE_DATE desc
                        

                     `;
                return pool.request().query(query2, function (err_query, recordset) {
                    if (err_query) {
                        dataout = {
                            status: 'error',
                            data: err_query,
                            query: query2
                        };
                        res.json(dataout);
                    } else {
                        var data = recordset.recordset;

                        if (recordset.recordset.length === 0) {
                            dataout = {
                                status: 'null'
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                data: data
                            };
                            res.json(dataout);

                        }
                    }
                    sql.close();
                });
            }
        });
    });
});

app.post('/update_Tracking_confirm_outbound', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

        update TSDC_CONFIRM_OUTBOUND
        set QTY_BOX  = QTY_BOX+ 1
        ,CREATE_DATE = getdate()
        where bill_no = '${fromdata.TRACK_CODE}'
        and pallet_no = '${fromdata.Pallet_NO}'
        and CONVERT(date,CREATE_DATE) = '${fromdata.currentDateString}'

     
   `;

        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                console.log(1)
                dataout = {
                    status: 'error1',
                    data: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                query2 = `
               
                select
                format ( CREATE_DATE ,'yyyy-MM-dd hh:mm:ss') as scandate
                ,PALLET_NO,QTY_BOX,BILL_NO,
                SHIP_PROVIDER_OOD,TCHANNEL
                ,ORDER_NO
				,(select sum(QTY_BOX) 
                        from TSDC_CONFIRM_OUTBOUND
                        where PALLET_NO  = '${fromdata.Pallet_NO}'
                        and CONVERT(date,CREATE_DATE) = CONVERT(date,getdate()) 
						) as count_qty

					from TSDC_CONFIRM_OUTBOUND
                        where PALLET_NO  = '${fromdata.Pallet_NO}'
                        and CONVERT(date,CREATE_DATE) = CONVERT(date,getdate()) 
                        order by CREATE_DATE desc
                        

                     `;
                return pool.request().query(query2, function (err_query, recordset) {
                    if (err_query) {
                        dataout = {
                            status: 'error',
                            data: err_query,
                            query: query2
                        };
                        res.json(dataout);
                    } else {
                        var data = recordset.recordset;

                        if (recordset.recordset.length === 0) {
                            dataout = {
                                status: 'null'
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                data: data
                            };
                            res.json(dataout);

                        }
                    }
                    sql.close();
                });
            }
        });

    });
});

app.post('/update_Tracking_confirm_outbound2', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

        MERGE INTO TSDC_CONFIRM_OUTBOUND AS target
        USING (SELECT TOP 1 *
        FROM TSDC_CONFIRM_OUTBOUND
        WHERE bill_no = '${fromdata.TRACK_CODE}'
         AND pallet_no = '${fromdata.Pallet_NO}'
         AND CAST(CREATE_DATE AS DATE) = CAST(GETDATE() AS DATE)) AS source
        ON target.bill_no = source.bill_no
        AND target.pallet_no = source.pallet_no
        AND CAST(target.CREATE_DATE AS DATE) = CAST(GETDATE() AS DATE)
        WHEN MATCHED THEN
        UPDATE SET target.QTY_BOX = target.QTY_BOX + 1,
               target.CREATE_DATE = GETDATE()
        WHEN NOT MATCHED BY TARGET THEN
        INSERT (BILL_NO, PALLET_NO, QTY_BOX, CREATE_DATE, PIN_ID, INTERNAL_ID, USER_CONFIRM_DELIVERY,
            DATE_DELIVERY, STATUS_DELIVERY, STATUS, SHIP_PROVIDER_OOD, ORDER_NO, TCHANNEL)
        VALUES ('${fromdata.TRACK_CODE}', '${fromdata.Pallet_NO}', 1, GETDATE(), '${fromdata.PIN_ID}',
            '${fromdata.INTERNAL_ID}', NULL, '', 'N', 'N', '${fromdata.SHIP_PROVIDER_OOD}',
            (SELECT DISTINCT ORDER_NUMBER_OOD
             FROM ONLINE_ORDER_DETAIL
             WHERE TRACK_CODE_OOD = '${fromdata.TRACK_CODE}'),
            (SELECT DISTINCT B.PARTNERNAME
             FROM ONLINE_ORDER_DETAIL A
             JOIN ONLINE_CUSTOMER_PARTNER B
                 ON A.SHOPID_OOD = B.SHOPID
             WHERE A.TRACK_CODE_OOD = '${fromdata.TRACK_CODE}'));


        --update TSDC_CONFIRM_OUTBOUND
        --set QTY_BOX  = QTY_BOX+ 1
        --,CREATE_DATE = getdate()
        --where bill_no = '${fromdata.TRACK_CODE}'
        --and pallet_no = '${fromdata.Pallet_NO}'
        --and CONVERT(date,CREATE_DATE) = '${fromdata.currentDateString}'

     
   `;

        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                console.log(1)
                dataout = {
                    status: 'error1',
                    data: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                query2 = `
               
                select
                format ( CREATE_DATE ,'yyyy-MM-dd hh:mm:ss') as scandate
                ,PALLET_NO,QTY_BOX,BILL_NO,
                SHIP_PROVIDER_OOD,TCHANNEL
                ,ORDER_NO
				,(select sum(QTY_BOX) 
                        from TSDC_CONFIRM_OUTBOUND
                        where PALLET_NO  = '${fromdata.Pallet_NO}'
                        and CONVERT(date,CREATE_DATE) = CONVERT(date,getdate()) 
						) as count_qty

					from TSDC_CONFIRM_OUTBOUND
                        where PALLET_NO  = '${fromdata.Pallet_NO}'
                        and CONVERT(date,CREATE_DATE) = CONVERT(date,getdate()) 
                        order by CREATE_DATE desc
                        

                     `;
                return pool.request().query(query2, function (err_query, recordset) {
                    if (err_query) {
                        dataout = {
                            status: 'error',
                            data: err_query,
                            query: query2
                        };
                        res.json(dataout);
                    } else {
                        var data = recordset.recordset;

                        if (recordset.recordset.length === 0) {
                            dataout = {
                                status: 'null'
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                data: data
                            };
                            res.json(dataout);

                        }
                    }
                    sql.close();
                });
            }
        });

    });
});

app.post('/DeleteAndBackup_Track_Outbound', function (req, res) {
    var fromdata = req.body;
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {
        var query = `
        insert into [TSDC_CONFIRM_OUTBOUND_CancelLog]
        select 
        [BILL_NO]
        ,[QTY_BOX]
        ,[CREATE_DATE]
        ,[STATUS]
        ,[PIN_ID]
        ,[INTERNAL_ID]
        ,[TCHANNEL]
        ,[SITE_ID]
        ,[PALLET_NO]
        ,[USER_CONFIRM_DELIVERY]
        ,[DATE_DELIVERY]
        ,[STATUS_DELIVERY]
        ,[delivery_no]
        ,[driver_name]
        ,[driver_car]
        ,[driver_transportation]
        ,[driver_signature]
        ,[ORDER_NO]
        ,[SHIP_PROVIDER_OOD]
        ,'${fromdata.PIN_ID}'
        ,getdate()
        from TSDC_CONFIRM_OUTBOUND
        where BILL_NO = '${fromdata.TRACK_CODE}'

        delete TSDC_CONFIRM_OUTBOUND
        where BILL_NO = '${fromdata.TRACK_CODE}'

        delete [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_CONFIRM_OUTBOUND
        where BILL_NO = '${fromdata.TRACK_CODE}'
        `
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success'
                };
                res.json(dataout); sql.close();
            }

        });
    });
});

app.post('/deleteTracking_outbount', function (req, res) {
    var fromdata = req.body;
    console.log("deleteTracking_outbount:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        DELETE  TSDC_CONFIRM_OUTBOUND
        where  PALLET_NO = '${fromdata.Pallet_NO}'
        and     Bill_no = '${fromdata.TRACK_CODE}'

        DELETE  [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_CONFIRM_OUTBOUND
        where  PALLET_NO = '${fromdata.Pallet_NO}'
        and     Bill_no = '${fromdata.TRACK_CODE}'
        `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var query2 = `
                
                select IDENTITY(INT,1,1) AS ID,
                CREATE_DATE AS CREATE_DATE
                ,PALLET_NO,QTY_BOX,BILL_NO,
                SHIP_PROVIDER_OOD,TCHANNEL
                        INTO #temp_NewTable 
                        from TSDC_CONFIRM_OUTBOUND
                        where PALLET_NO  = '${fromdata.Pallet_NO}'
                        and CONVERT(date,CREATE_DATE) = CONVERT(date,getdate()) 
                        group by PALLET_NO,CREATE_DATE,QTY_BOX,BILL_NO,
                        SHIP_PROVIDER_OOD,TCHANNEL
                        order by CREATE_DATE desc

                        
                        select *,format ( CREATE_DATE ,'yyyy-MM-dd hh:mm:ss') as scandate,(select count(*)from #temp_NewTable ) as count_qty
                        from #temp_NewTable
                     `;
                return pool.request().query(query2, function (err_query2, recordset) {
                    if (err_query2) {
                        dataout = {
                            status: 'error',
                            data: err_query2,
                            query: query2
                        };
                        res.json(dataout);
                    } else {
                        var data = recordset.recordset;

                        if (recordset.recordset.length === 0) {
                            dataout = {
                                status: 'null',
                                query: query2
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                data: data,
                                query: query2
                            };
                            res.json(dataout);
                        }
                    }
                    sql.close();
                });
            }
        });
    });
});

app.post('/interface_Tracking_confirm_outbound', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        
        insert into [10.26.1.11].TSDC_Conveyor.dbo.TSDC_CONFIRM_OUTBOUND
        select * from TSDC_CONFIRM_OUTBOUND A
        where  NOT EXISTS 
        (SELECT 1 FROM [10.26.1.11].TSDC_Conveyor.dbo.TSDC_CONFIRM_OUTBOUND B
            WHERE A.[BILL_NO] = B.[BILL_NO] 
            and CAST(CREATE_DATE AS DATE)  = CAST(GETDATE() AS DATE)  
        ) and BILL_NO not in
		(
		Select BILL_NO From [10.26.1.11].TSDC_Conveyor.dbo.TSDC_CONFIRM_OUTBOUND
		)
        and A.PALLET_NO ='${fromdata.Pallet_NO}'

   `;


        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/interface_Tracking_confirm_outbound2', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        delete [10.26.1.11].TSDC_Conveyor.dbo.TSDC_CONFIRM_OUTBOUND
        where CAST(CREATE_DATE AS DATE)  = CAST(GETDATE() AS DATE) 
        and PALLET_NO ='${fromdata.Pallet_NO}' ${fromdata.condition};

        insert into [10.26.1.11].TSDC_Conveyor.dbo.TSDC_CONFIRM_OUTBOUND
        select * from TSDC_CONFIRM_OUTBOUND 
        where CAST(CREATE_DATE AS DATE)  = CAST(GETDATE() AS DATE) 
        and PALLET_NO ='${fromdata.Pallet_NO}' ${fromdata.condition};

        --insert into [10.26.1.11].TSDC_Conveyor.dbo.TSDC_CONFIRM_OUTBOUND
        --select * from TSDC_CONFIRM_OUTBOUND A
        --where  NOT EXISTS 
        --(SELECT 1 FROM [10.26.1.11].TSDC_Conveyor.dbo.TSDC_CONFIRM_OUTBOUND B
        --    WHERE A.[BILL_NO] = B.[BILL_NO] 
        --    and CAST(CREATE_DATE AS DATE)  = CAST(GETDATE() AS DATE)  
        --) and BILL_NO not in
		--(
	    --Select BILL_NO From [10.26.1.11].TSDC_Conveyor.dbo.TSDC_CONFIRM_OUTBOUND
		--)
        --and A.PALLET_NO ='${fromdata.Pallet_NO}'
        
   `;


        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

/////////////////////////////////////////////// upgrage sql

app.post('/CheckWork_ug', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        
     
        select distinct TSDC_PICK_CHECK_NEW.CONTAINER_ID ,TSDC_PICK_CHECK_NEW.SELLER_NO,'${fromdata.USER_NAME}' as USER_NAME,TSDC_PICK_CHECK_NEW.ORDER_TYPE,TSDC_PICK_CHECK_NEW.SHIPMENT_ID,p.COMPANY,(FORMAT(p.ORDER_DATE,'dd/MM/yyyy')) ORDER_DATE
         from TSDC_PICK_CHECK_NEW 
		  inner join TSDC_CONTAINER_MAPORDER  m on TSDC_PICK_CHECK_NEW.CONTAINER_ID = m.CONTAINER_ID
		 left join TSDC_PROCESS_ORDER_HEADER_TRANFER21 p on TSDC_PICK_CHECK_NEW.SHIPMENT_ID = p.SHIPMENT_ID		
        where  TSDC_PICK_CHECK_NEW.CONTAINER_ID = '${fromdata.CONTAINER_ID}'
        and  TSDC_PICK_CHECK_NEW.ORDER_TYPE != 'CANCEL'
        AND  TSDC_PICK_CHECK_NEW.SELLER_NO = m.SELLER_NO
		and TSDC_PICK_CHECK_NEW.SHIPMENT_ID = m.SHIPMENT_ID
       
                       

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {

                    var query2 = `        

                    select distinct TSDC_PICK_CHECK_NEW.CONTAINER_ID ,TSDC_PICK_CHECK_NEW.SELLER_NO,'${fromdata.USER_NAME}' as USER_NAME,TSDC_PICK_CHECK_NEW.ORDER_TYPE,TSDC_PICK_CHECK_NEW.SHIPMENT_ID,p.COMPANY,(FORMAT(p.ORDER_DATE,'dd/MM/yyyy')) ORDER_DATE
                    from TSDC_PICK_CHECK_NEW 
                     inner join TSDC_CONTAINER_MAPORDER  m on TSDC_PICK_CHECK_NEW.CONTAINER_ID = m.CONTAINER_ID
                    left join TSDC_PROCESS_ORDER_HEADER_TRANFER21 p on TSDC_PICK_CHECK_NEW.SHIPMENT_ID = p.SHIPMENT_ID		
                   where  TSDC_PICK_CHECK_NEW.CONTAINER_ID = '${fromdata.CONTAINER_ID}'
                   AND  TSDC_PICK_CHECK_NEW.SELLER_NO = m.SELLER_NO
                   and TSDC_PICK_CHECK_NEW.SHIPMENT_ID = m.SHIPMENT_ID
                    
                   `;
                    return pool.request().query(query2, function (err_query, recordset) {
                        if (err_query) {
                            dataout = {
                                status: 'error',
                                member: err_query,
                                query: query2,
                            };
                            res.json(dataout);
                        } else {
                            var data = recordset.recordset;
                            if (recordset.recordset.length === 0) {
                                dataout = {
                                    status: 'null'
                                };
                                res.json(dataout);
                            } else {
                                dataout = {
                                    status: 'success',
                                    data: data
                                };
                                res.json(dataout);
                            }
                        }
                    });
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/CheckConOnline_ug', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("CheckConOnline :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

        select *  from (
           SELECT  sum(QTY_CHECK) as SUMCHECK
              ,sum(QTY_PICK) as SUMCON
              ,shipment_id
              ,SELLER_NO
              ,'' as USER_DEF5
              ,customer_id as 'Owner'
              ,status_print as 'Print_Tracking'
                FROM   TSDC_PICK_CHECK_NEW A,TSDC_CONTROL_PRINT_ONLINE_TRACKING B
                WHERE SHIPMENT_ID = '${fromdata.shipment_id}'
                and SELLER_NO = '${fromdata.SELLER_NO}'
                and a.SELLER_NO = b.SELLER_id
                group by  shipment_id,SELLER_NO
                --,BRAND
               ,customer_id,status_print ) as a,
           (select  SHIPPING_NAME,PO_NO,SHIP_NO,TCHANNEL from TSDC_INTERFACE_ORDER_HEADER) as c
               where  a.SHIPMENT_ID = c.PO_NO
               and a.SELLER_NO = c.SHIP_NO 

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query,
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/matchItemInCon_ug', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
       
        SELECT   SHIPMENT_ID
                ,ITEM_ID
                ,ITEM_DESC
				,SELLER_NO
                ,QTY_REQUESTED
                ,QTY_PICK 
                ,QTY_CHECK
				,FORMAT(TRANSACTION_DATE,'dd-MM-yyyy') as TRANSACTION_DATE
                ,ORDER_TYPE
        FROM   TSDC_PICK_CHECK_NEW
        WHERE  SHIPMENT_ID = '${fromdata.shipment_id}'
        and SELLER_NO = '${fromdata.SELLER_NO}'
        AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'notfound'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/checkEqualCon_ug', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        SELECT  
        ITEM_ID,
        QTY_PICK,
        (case
            when sum(QTY_CHECK) = QTY_PICK then 'equal'
            when sum(QTY_CHECK) > QTY_PICK then 'equal'
            else 'not_equal'
            end) as QTY_equal
       
        FROM   TSDC_PICK_CHECK_NEW   
        where SHIPMENT_ID = '${fromdata.shipment_id}'
        and SELLER_NO = '${fromdata.SELLER_NO}'
        AND  ITEM_ID_BARCODE =  '${fromdata.ITEM_ID_BARCODE}'

       group by  ITEM_ID,QTY_PICK,SHIPMENT_ID,SELLER_NO
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/BOX_CONTROL_DETAIL_ug', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("BOX_CONTROL :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        select * from  TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
        where REF_INDEX is null
        and TABLE_CHECK = '${fromdata.TABLE_CHECK}'
        and PO_NO = '${fromdata.shipment_id}'
        AND SELLER_NO = '${fromdata.SELLER_NO}'
        and ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'      
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {

                    var query = `        
                            
                    BEGIN TRANSACTION;

                    BEGIN TRY
                            INSERT INTO TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
                                ([REF_INDEX]
                                ,[CONTAINERID]
                                ,[PO_NO]
                                ,SELLER_NO
                                ,[BOX_NO_ORDER]
                                ,[ITEM_ID]
                                ,[QTY]
                                ,[USER_CHECK]
                                ,[TABLE_CHECK]
                                ,[ITEM_ID_BARCODE])
                            VALUES
                                (NULL
                                ,'${fromdata.CONTAINER_ID}'
                                ,'${fromdata.shipment_id}'
                                ,'${fromdata.SELLER_NO}'
                                ,NULL
                                ,'${fromdata.ITEM_ID}'
                                ,1
                                ,'${fromdata.PIN_CODE}'
                                ,LTRIM(RTRIM('${fromdata.TABLE_CHECK}'))
                                ,'${fromdata.ITEM_ID_BARCODE}');


                                UPDATE  TSDC_PICK_CHECK_NEW
                                SET		QTY_CHECK = QTY_CHECK + 1 
                                ,   USER_CHECK = '${fromdata.USER_NAME}'
                                 , END_DATE_TIME = getdate() , 
                                START_DATE_TIME = (case when QTY_CHECK = 0 then GETDATE() else START_DATE_TIME end),
                                TABLE_CHECK = '${fromdata.TABLE_CHECK}'
                                where   SHIPMENT_ID = (select SHIPMENT_ID from  TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                                and SELLER_NO =  (select SELLER_NO from  TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                                    AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
                                    and QTY_CHECK < QTY_PICK


                                    insert into [TSDC_PICK_CHECK_LOG_NEW]
                                    select CONTAINER_ID,ITEM_ID,QTY_CHECK,GETDATE(),'${fromdata.USER_NAME}' as USER_NAME ,SHIPMENT_ID ,'${fromdata.TABLE_CHECK}' as TABLE_CHECK,null from (
                                
                                select CONTAINER_ID,ITEM_ID,'1' as QTY_CHECK ,GETDATE() as DATE_TIME_STAMP,SHIPMENT_ID ,TABLE_CHECK from TSDC_PICK_CHECK_NEW
                                where   CONTAINER_ID = '${fromdata.CONTAINER_ID}'
                                    AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
                                
                                    ) as a;

                            COMMIT TRANSACTION;
                            END TRY
                            BEGIN CATCH
                            -- If an error occurs, roll back the transaction
                            ROLLBACK TRANSACTION;

                            -- Optionally, log or re-throw the error
                            DECLARE @ErrorMessage NVARCHAR(4000), @ErrorSeverity INT, @ErrorState INT;
                            SELECT
                                @ErrorMessage = ERROR_MESSAGE(),
                                @ErrorSeverity = ERROR_SEVERITY(),
                                @ErrorState = ERROR_STATE();
                            RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
                        END CATCH;


                        `;
                    return pool.request().query(query, function (err_query) {
                        if (err_query) {
                            dataout = {
                                status: 'error',
                                member: err_query,
                                query: query
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                query: query
                            };
                            res.json(dataout);
                        }
                        sql.close();
                    });

                } else {
                    var query = `

                    BEGIN TRANSACTION;

                    BEGIN TRY

                    update TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
                    set QTY = QTY+1
                    where   REF_INDEX is null
                    and TABLE_CHECK = '${fromdata.TABLE_CHECK}'
                    and PO_NO = '${fromdata.shipment_id}'
                    AND SELLER_NO = '${fromdata.SELLER_NO}'
                    and ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}' 
                    and QTY < '${fromdata.check_QTY_PICK}' 


                    UPDATE  TSDC_PICK_CHECK_NEW
                    SET		QTY_CHECK = QTY_CHECK + 1 
                    ,   USER_CHECK = '${fromdata.USER_NAME}'
                     , END_DATE_TIME = getdate() , 
                    START_DATE_TIME = (case when QTY_CHECK = 0 then GETDATE() else START_DATE_TIME end),
                    TABLE_CHECK = '${fromdata.TABLE_CHECK}'
                    where   SHIPMENT_ID = (select SHIPMENT_ID from  TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                    and SELLER_NO =  (select SELLER_NO from  TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                        AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
                        and QTY_CHECK < QTY_PICK


                    insert into [TSDC_PICK_CHECK_LOG_NEW]
                            select CONTAINER_ID,ITEM_ID,QTY_CHECK,GETDATE(),'${fromdata.USER_NAME}' as USER_NAME ,SHIPMENT_ID ,'${fromdata.TABLE_CHECK}' as TABLE_CHECK,null from (
                        
                        select CONTAINER_ID,ITEM_ID,'1' as QTY_CHECK ,GETDATE() as DATE_TIME_STAMP,SHIPMENT_ID ,TABLE_CHECK from TSDC_PICK_CHECK_NEW
                        where   CONTAINER_ID = '${fromdata.CONTAINER_ID}'
                            AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
                        
                            ) as a;

                            -- If all succeed, commit the transaction
                            COMMIT TRANSACTION;
                        END TRY
                        BEGIN CATCH
                            -- If an error occurs, roll back the transaction
                            ROLLBACK TRANSACTION;
                        
                            -- Optionally, log or re-throw the error
                            DECLARE @ErrorMessage NVARCHAR(4000), @ErrorSeverity INT, @ErrorState INT;
                            SELECT
                                @ErrorMessage = ERROR_MESSAGE(),
                                @ErrorSeverity = ERROR_SEVERITY(),
                                @ErrorState = ERROR_STATE();
                            RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
                        END CATCH;                    

                     `;
                    return pool.request().query(query, function (err_query) {
                        if (err_query) {
                            dataout = {
                                status: 'error',
                                member: err_query,
                                query: query
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                query: query
                            };
                            res.json(dataout);
                        }
                        sql.close();
                    });
                }
            }
        });
    });
});

app.get('/get_transport', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        select * from [10.26.1.11].TSDC_Conveyor.dbo.TSDC_TRANSPORT
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.post('/Moniter_statusRTS', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        SELECT *,FORMAT(FDCreatedate,'dd-MM-yyyy HH:mm:ss') as Createdate 
        ,FORMAT(FDLastupdate,'dd-MM-yyyy HH:mm:ss') as Lastupdate FROM TSDC_SHOPEE_PACKAGE_HD
        ${fromdata.condition}
        order by FDLastupdate desc
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/Moniter_SumstatusRTS', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        SELECT 
        SUM(CASE WHEN FNStaUpLoad_rts = 0 THEN 1 ELSE 0 END) AS status_0,
        SUM(CASE WHEN FNStaUpLoad_rts = 2 THEN 1 ELSE 0 END) AS status_2,
        SUM(CASE WHEN FNStaUpLoad_rts = 99 THEN 1 ELSE 0 END) AS status_99,
        SUM(CASE WHEN FNStaUpLoad_rts = 1 THEN 1 ELSE 0 END) AS status_1,
        SUM(CASE WHEN FNStaUpLoad_rts = 5 THEN 1 ELSE 0 END) AS status_5
        FROM TSDC_SHOPEE_PACKAGE_HD
        ${fromdata.conditionSum}
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});


app.post('/Moniter_InterfaceErrorManH', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        SELECT 
                ERROR_MSG,
                COMPANY,
                FORMAT(DT_LOCAL,'dd-MM-yyyy HH:mm:ss') AS DATE_TIME_STAMP,
                SHIPMENT_ID,
                INTERFACE_PROCESS
            FROM (
                SELECT 
                    ERROR_MSG,
                    COMPANY,
                    DATEADD(HOUR, 7, DATE_TIME_STAMP) AS DT_LOCAL,
                    REFERENCE_ID01 AS SHIPMENT_ID,
                    INTERFACE_PROCESS
                FROM [10.26.1.83].ILS.dbo.INTERFACE_ERROR
                WHERE INTERFACE_PROCESS = 'Shipping'
                AND WAREHOUSE IS NOT NULL
                AND REFERENCE_ID01 NOT IN (
                        SELECT shipment_id 
                        FROM [10.26.1.83].ILS.dbo.SHIPMENT_HEADER
                )
                AND DATEADD(HOUR, 7, DATE_TIME_STAMP) >= DATEADD(DAY, -1, CAST(DATEADD(HOUR, 7, GETDATE()) AS DATE))

                UNION ALL

                SELECT 
                    'TITEM = ' + IE.REFERENCE_ID06 + ' : ' + ERROR_MSG,
                    COMPANY,
                    DATEADD(HOUR, 7, DATE_TIME_STAMP) AS DT_LOCAL,
                    REFERENCE_ID01 AS SHIPMENT_ID,
                    INTERFACE_PROCESS
                FROM [10.26.1.83].ILS.dbo.INTERFACE_ERROR IE
                WHERE IE.interface_process = 'Receiving'
                AND (IE.REFERENCE_ID01 IS NULL OR IE.REFERENCE_ID01 = '')
                AND DATEADD(HOUR, 7, IE.DATE_TIME_STAMP) >= DATEADD(DAY, -1, CAST(DATEADD(HOUR, 7, GETDATE()) AS DATE))
                AND NOT EXISTS (
                        SELECT 1
                        FROM [10.26.1.83].ILS.dbo.RECEIPT_DETAIL RD
                        WHERE RD.item = IE.REFERENCE_ID06
                        AND RD.ERP_ORDER_LINE_NUM = IE.REFERENCE_ID07
                        AND CAST(RD.DATE_TIME_STAMP AS DATE) = CAST(IE.DATE_TIME_STAMP AS DATE)
                )

                UNION ALL

                SELECT 
                    ERROR_MSG,
                    COMPANY,
                    DATEADD(HOUR, 7, DATE_TIME_STAMP) AS DT_LOCAL,
                    REFERENCE_ID01 AS SHIPMENT_ID,
                    INTERFACE_PROCESS
                FROM [10.26.1.83].ILS.dbo.INTERFACE_ERROR IE
                WHERE IE.interface_process = 'Receiving'
                AND IE.REFERENCE_ID01 IS NOT NULL 
                AND IE.REFERENCE_ID01 != ''
                AND DATEADD(HOUR, 7, IE.DATE_TIME_STAMP) >= DATEADD(DAY, -1, CAST(DATEADD(HOUR, 7, GETDATE()) AS DATE))
                AND NOT EXISTS (
                        SELECT 1
                        FROM [10.26.1.83].ILS.dbo.RECEIPT_HEADER RH
                        WHERE RH.RECEIPT_ID = IE.REFERENCE_ID01
                )
            ) AS T
            ORDER BY DT_LOCAL DESC;
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/update_statusRTS', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('update_statusRTS');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {
        var query = `
        `
        fromdata.forEach(function (element) {
            query += ` 
            update TSDC_SHOPEE_PACKAGE_HD
            set FNStaUpLoad_rts = 0
            ,FTStaUpLoad_rts_desc = 'wait_update'
            ,FDLastupdate = getdate()
            where FTOrdernumber = '${element.FTOrdernumber}';
            `
        });

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/check_order_notclose', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        
    select * from [V_WORK_INSTRUCTION_VIEW_ORDER_NOT_CLOSE] 
	where CONTAINER_ID = '${fromdata.CONTAINER_ID}'
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/check_order_closed', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        
    select * from [V_WORK_INSTRUCTION_VIEW_ORDER_CLOSED] 
	where CONTAINER_ID = '${fromdata.CONTAINER_ID}'
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

//////////////////// check_TRACKING
app.post('/CheckWorktrack', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        
   
        select distinct PICK_CHECK.CONTAINER_ID ,PICK_CHECK.SELLER_NO,'${fromdata.USER_NAME}' as USER_NAME,PICK_CHECK.ORDER_TYPE,PICK_CHECK.SHIPMENT_ID,p.COMPANY,(FORMAT(p.ORDER_DATE,'dd/MM/yyyy')) ORDER_DATE
        from TSDC_PICK_CHECK_NEW_TRACKING as PICK_CHECK
		  inner join TSDC_CONTAINER_MAPORDER  m on PICK_CHECK.CONTAINER_ID = m.CONTAINER_ID
		left join TSDC_PROCESS_ORDER_HEADER_TRANFER21 p on PICK_CHECK.SHIPMENT_ID = p.SHIPMENT_ID		
        where  PICK_CHECK.CONTAINER_ID = '${fromdata.CONTAINER_ID}'
        and  PICK_CHECK.ORDER_TYPE != 'CANCEL'
        AND  PICK_CHECK.SELLER_NO = m.SELLER_NO
		and PICK_CHECK.SHIPMENT_ID = m.SHIPMENT_ID
       
                       

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {

                    var query2 = `        

                    select distinct PICK_CHECK.CONTAINER_ID ,PICK_CHECK.SELLER_NO,'${fromdata.USER_NAME}' as USER_NAME,PICK_CHECK.ORDER_TYPE,PICK_CHECK.SHIPMENT_ID,p.COMPANY,(FORMAT(p.ORDER_DATE,'dd/MM/yyyy')) ORDER_DATE
                    from TSDC_PICK_CHECK_NEW_TRACKING as  PICK_CHECK
                     inner join TSDC_CONTAINER_MAPORDER  m on PICK_CHECK.CONTAINER_ID = m.CONTAINER_ID
                    left join TSDC_PROCESS_ORDER_HEADER_TRANFER21 p on PICK_CHECK.SHIPMENT_ID = p.SHIPMENT_ID		
                   where  PICK_CHECK.CONTAINER_ID = '${fromdata.CONTAINER_ID}'
                   AND  PICK_CHECK.SELLER_NO = m.SELLER_NO
                   and PICK_CHECK.SHIPMENT_ID = m.SHIPMENT_ID
                    
                   `;
                    return pool.request().query(query2, function (err_query, recordset) {
                        if (err_query) {
                            dataout = {
                                status: 'error',
                                member: err_query,
                                query: query2,
                            };
                            res.json(dataout);
                        } else {
                            var data = recordset.recordset;
                            if (recordset.recordset.length === 0) {
                                dataout = {
                                    status: 'null'
                                };
                                res.json(dataout);
                            } else {
                                dataout = {
                                    status: 'success',
                                    data: data
                                };
                                res.json(dataout);
                            }
                        }
                    });
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/CheckConOnlinetrack', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("CheckConOnlinetrack :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

        select *  from (
            SELECT  sum(QTY_CHECK) as SUMCHECK
               ,sum(QTY_PICK) as SUMCON
               ,shipment_id
               ,SELLER_NO
               ,'' as USER_DEF5
               ,customer_id as 'Owner'
               ,status_print as 'Print_Tracking'
                 FROM   TSDC_PICK_CHECK_NEW_TRACKING A,TSDC_CONTROL_PRINT_ONLINE_TRACKING B
                 WHERE SHIPMENT_ID = '${fromdata.shipment_id}'
                 and SELLER_NO = '${fromdata.SELLER_NO}' ${fromdata.conditiontracking || ''}
                 and a.SELLER_NO = b.SELLER_id
                 and a.ORDER_TYPE != 'CANCEL'
                 group by  shipment_id,SELLER_NO
                 --,BRAND
                ,customer_id,status_print ) as a,
            (select  SHIPPING_NAME,PO_NO,SHIP_NO,TCHANNEL from TSDC_INTERFACE_ORDER_HEADER) as c
                where  a.SHIPMENT_ID = c.PO_NO
                and a.SELLER_NO = c.SHIP_NO 

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query,
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/summaryContrack', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
    
        select ITEM_ID
        ,QTY_REQUESTED
        ,QTY_PICK
        ,ITEM_ID_BARCODE
        ,ITEM_DESC
        ,sum(QTY_CHECK) as QTY_CHECK
        ,SHIPMENT_ID
        ,case when ORDER_TYPE = 'CANCEL' then 'CANCEL' else '' end  as ITME_CANCEL
        ,a.SELLER_NO
        ,BRAND
        ,UOM_PICK
        ,CASE
    WHEN sum(QTY_CHECK) <> QTY_PICK THEN '0'
    ELSE '1'
   END AS STATUS_CHECK
   , case when (select    max(BOX_NO_ORDER)  MaxBox_NO
        from TSDC_PICK_CHECK_BOX_CONTROL_NEW a
        where PO_NO  = '${fromdata.shipment_id}'
        AND SELLER_NO = '${fromdata.SELLER_NO}' ${fromdata.conditiontracking || ''}
       ) IS NULL then 0
   else (select    max(BOX_NO_ORDER)  MaxBox_NO
        from TSDC_PICK_CHECK_BOX_CONTROL_NEW a
        where PO_NO = '${fromdata.shipment_id}'
        AND SELLER_NO = '${fromdata.SELLER_NO}' ${fromdata.conditiontracking || ''}
       )
   end MaxBox_NO ,a.TRACKING,b.REF_INDEX
   
        FROM TSDC_PICK_CHECK_NEW_TRACKING a
        left join TSDC_PICK_CHECK_BOX_CONTROL_NEW b on a.TRACKING = b.TRACKING
        and a.SHIPMENT_ID = b.PO_NO
        where SHIPMENT_ID  = '${fromdata.shipment_id}'
        AND a.SELLER_NO = '${fromdata.SELLER_NO}'${fromdata.conditiontracking || ''}
        group by shipment_ID ,a.SELLER_NO, ITEM_ID  ,a.TRACKING  ,QTY_REQUESTED,ITEM_ID_BARCODE
        ,QTY_PICK ,BRAND,ITEM_DESC,UOM_PICK,ORDER_TYPE,b.REF_INDEX
        order by STATUS_CHECK , QTY_CHECK
         
      
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                        , query: query
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/matchItemInContrack', async function (req, res) {
    const fromdata = req.body;
    const Datenow = DateNow();
    let pool;

    try {
        pool = await new sql.ConnectionPool(db).connect();

        const query = `
            SELECT SHIPMENT_ID, ITEM_ID, ITEM_DESC, SELLER_NO,
                   QTY_REQUESTED, QTY_PICK, QTY_CHECK,
                   FORMAT(TRANSACTION_DATE,'dd-MM-yyyy') as TRANSACTION_DATE,
                   ORDER_TYPE, TRACKING
            FROM TSDC_PICK_CHECK_NEW_TRACKING a
            WHERE SHIPMENT_ID = @shipment_id
            AND SELLER_NO = @SELLER_NO
            AND ITEM_ID_BARCODE = @ITEM_ID_BARCODE
            ${fromdata.conditiontracking || ''}
        `;

        const result = await pool.request()
            .input('shipment_id', sql.VarChar, fromdata.shipment_id)
            .input('SELLER_NO', sql.VarChar, fromdata.SELLER_NO)
            .input('ITEM_ID_BARCODE', sql.VarChar, fromdata.ITEM_ID_BARCODE)
            .query(query);

        if (result.recordset.length === 0) {
            return res.json({ status: 'notfound' });
        }

        res.json({ status: 'success', data: result.recordset });

    } catch (err) {
        res.json({ status: 'error', data: err });
    } finally {
        if (pool) await pool.close();
    }
});


app.post('/checktracking_Inshipment', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
       
        select TRACKING,sum(QTY_PICK) QTY_PICK ,sum(QTY_CHECK) QTY_CHECK  
        FROM   TSDC_PICK_CHECK_NEW_TRACKING  a
         WHERE  SHIPMENT_ID = '${fromdata.shipment_id}'
         and SELLER_NO = '${fromdata.SELLER_NO}' ${fromdata.condition_nontracking || ''}
         and TRACKING is not null
         and TRACKING != ''
         and ORDER_TYPE != 'CANCEL'
         group by SHIPMENT_ID,SELLER_NO,TRACKING 
         HAVING  SUM(QTY_CHECK) > 0 AND  SUM(QTY_PICK) != SUM(QTY_CHECK);

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/checkEqualContrack', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        SELECT  top 1 
        ITEM_ID,
        QTY_PICK,
        TRACKING,
        (case
            when sum(QTY_CHECK) = QTY_PICK then 'equal'
            when sum(QTY_CHECK) > QTY_PICK then 'equal'
            else 'not_equal'
            end) as QTY_equal
       
        FROM   TSDC_PICK_CHECK_NEW_TRACKING  a
        where SHIPMENT_ID = '${fromdata.shipment_id}'
        and SELLER_NO = '${fromdata.SELLER_NO}'
        AND  ITEM_ID_BARCODE =  '${fromdata.ITEM_ID_BARCODE}'
        ${fromdata.conditiontracking || ''}

       group by  ITEM_ID,QTY_PICK,SHIPMENT_ID,SELLER_NO,TRACKING
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query,
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});


app.post('/updateConQtyChecktrack', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  

        
        UPDATE  TSDC_PICK_CHECK_NEW_TRACKING
        SET		QTY_CHECK = QTY_CHECK + 1 
        ,   USER_CHECK = '${fromdata.USER_NAME}'
        , END_DATE_TIME = getdate() , 
        START_DATE_TIME = (case when QTY_CHECK = 0 then GETDATE() else START_DATE_TIME end),
        TABLE_CHECK = '${fromdata.TABLE_CHECK}'
        from TSDC_PICK_CHECK_NEW_TRACKING a
        where   SHIPMENT_ID = (select SHIPMENT_ID from  TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
        and SELLER_NO =  (select SELLER_NO from  TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
            AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
            ${fromdata.conditiontracking || ''}
            and QTY_CHECK < QTY_PICK
   
     `;


        query += `

     insert into [TSDC_PICK_CHECK_LOG_NEW]
     select CONTAINER_ID,ITEM_ID,QTY_CHECK,GETDATE(),'${fromdata.USER_NAME}' as USER_NAME ,SHIPMENT_ID ,'${fromdata.TABLE_CHECK}' as TABLE_CHECK,null from (
  
  select CONTAINER_ID,ITEM_ID,'1' as QTY_CHECK ,GETDATE() as DATE_TIME_STAMP,SHIPMENT_ID ,TABLE_CHECK from TSDC_PICK_CHECK_NEW_TRACKING
  where   CONTAINER_ID = '${fromdata.CONTAINER_ID}'
      AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
  
     ) as a
    
`;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/UpdateChecktrackdate', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        UPDATE  TSDC_PICK_CHECK_NEW_TRACKING 
        SET 	CHECK_DATE = GETDATE()
        from TSDC_PICK_CHECK_NEW_TRACKING a
        WHERE	
                 SHIPMENT_ID = '${fromdata.shipment_id}'
				 and SELLER_NO = '${fromdata.SELLER_NO}'
                 and CHECK_DATE is null
                 ${fromdata.conditiontracking || ''}
     
        `;



        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/checkpathfile_labeltracking', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `      
        
        select  *  from TSDC_PICK_CHECK_NEW_TRACKING a
        where   FILE_PACKING != ''
        and FILE_PACKING is not null
        and TRACKING != ''
        and TRACKING is not null
        and SHIPMENT_ID = '${fromdata.shipment_id}'
        and SELLER_NO = '${fromdata.SELLER_NO}'
        ${fromdata.conditiontracking || ''}
                           
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/updateCoverSheettrack', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
  
        UPDATE  TSDC_PICK_CHECK_NEW_TRACKING
        SET	CHECK_DATE = getdate()	
        where   SHIPMENT_ID =  '${fromdata.shipment_id}'
        and SELLER_NO =  '${fromdata.SELLER_NO}';

        update TSDC_PICK_PRINT_SHIP_DELIVERY
        set CARTON_NO = '${fromdata.MaxBox_NO}'
        ,PRINT_STATUS = 'Y'
        where (BILL_N8_BLH = '${fromdata.shipment_id}' or BILL_NO = '${fromdata.shipment_id}')  
        and STORE_NO = '${fromdata.SELLER_NO}'
   
     `;


        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/summary_ITEM_LACK_Track', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

       
            select ITEM_ID
            ,QTY_REQUESTED
            ,QTY_PICK
            ,sum(QTY_CHECK) as QTY_CHECK
            ,(QTY_PICK -sum(QTY_CHECK)) as QTY_LACK
            ,a.SHIPMENT_ID
            ,(FORMAT(GETDATE(),'dd-MM-yyyy ') 
            + CONVERT(VARCHAR(5),CONVERT(DATETIME, GETDATE() , 0), 108) )as TO_DAY
            ,STORE_NO
            ,STORE_NAME
            ,(FORMAT(BILL_DATE,'dd-MM-yyyy'))  as ORDER_DATE
            FROM TSDC_PICK_CHECK_NEW_TRACKING  a , TSDC_PICK_PRINT_SHIP_DELIVERY b
            where a.SHIPMENT_ID = '${fromdata.shipment_id}' 
            and SELLER_NO  =   '${fromdata.SELLER_NO}' 
            and (a.SHIPMENT_ID = b.BILL_N8_BLH or a.SHIPMENT_ID = b.BILL_NO)
            and a.SELLER_NO = b.STORE_NO
            group by a.shipment_ID , ITEM_ID   ,QTY_REQUESTED ,QTY_PICK ,STORE_NO
            ,STORE_NAME
            ,BILL_DATE
            HAVING (sum(QTY_CHECK) - QTY_PICK) <> '0'
                
    
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        data: err_query
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/Rescan_checkitem_track', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        update TSDC_PICK_CHECK_NEW_TRACKING
		set QTY_CHECK = CASE 
                    WHEN QTY_CHECK - QTY < 0 THEN 0
                    ELSE QTY_CHECK - QTY
                END
        ,CHECK_DATE = NULL
		from TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW a,TSDC_PICK_CHECK_NEW_TRACKING b
        where   REF_INDEX is null
        and PO_NO = '${fromdata.shipment_id}'
        AND a.SELLER_NO = '${fromdata.SELLER_NO}'  ${fromdata.conditiontracking || ''}
		and a.PO_NO = b.SHIPMENT_ID 
		AND a.SELLER_NO = B.SELLER_NO
		AND a.ITEM_ID = B.ITEM_ID
        And a.Tracking = B.TRACKING

     `;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {

                var query2 = `
                delete TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW 
                from TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW a
                where   REF_INDEX is null
                and PO_NO = '${fromdata.shipment_id}'
                AND SELLER_NO = '${fromdata.SELLER_NO}'  ${fromdata.conditiontracking || ''};
             `;

                return pool.request().query(query2, function (err_query) {
                    if (err_query) {
                        dataout = {
                            status: 'error',
                            member: err_query,
                            query: query
                        };
                        res.json(dataout);
                    } else {
                        dataout = {
                            status: 'success',
                            query: query
                        };
                        res.json(dataout);
                    }
                    sql.close();
                });

            }
            sql.close();
        });
    });
});

app.post('/Insert_PICK_CHECK_LOG_NEW', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        insert into TSDC_PICK_CHECK_LOG_NEW
        select '${fromdata.CONTAINER_ID}',null,null,getdate(),'${fromdata.USER_NAME}','${fromdata.shipment_id}','${fromdata.TABLE_CHECK}','${fromdata.WARNING}' 
     
        `;



        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/Get_ONLINE_ORDER_SHIPPING', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `      
        
        select  *,CONVERT(VARCHAR(16), CAST(RTS_DATE_OOS AS DATETIME), 120) AS RTS_DATE  from [10.26.1.11].[TSDC_CONVEYOR].[DBO].ONLINE_ORDER_SHIPPING
        where  order_number_oos = '${fromdata.shipment_id}'
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/UPDATE_TrackingAndRTS', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
  
        UPDATE  [10.26.1.11].[TSDC_CONVEYOR].[DBO].ONLINE_ORDER_SHIPPING
        SET	RTS_DATE_OOS = getdate()
        ,RTS_STATUS_OOS = 'S'
        ,TRACKING_OOS = '${fromdata.TRACK_CODE}'
        where   ORDER_NUMBER_OOS =  '${fromdata.shipment_id}'

     `;


        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/Moniter_TrackingOrderInternal_Summary', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        const condition_date = fromdata.dateTo ? `and ORDER_DATE between '${fromdata.dateFrom}' AND '${fromdata.dateTo}' ` : '';
        const condition_Processdate = fromdata.PCdateTo ? `and PROCESS_DATE between '${fromdata.PCdateFrom}' AND '${fromdata.PCdateTo}' ` : '';
        const condition_company = fromdata.company ? ` AND COMPANY = '${fromdata.company}' ` : '';
        //+ this.input.dateFrom +"' AND DATEADD(DAY, 1,'"+this.input.dateTo+"')"
        var query = `        
        SELECT  [ORDER_DATE]
            ,[COMPANY]
            ,[WORK_TYPE]
            ,[ORDER_ALL]
            ,[ORDER_WAIT_PROCESS_MANHT]
            ,[ORDER_WAIT_PROCESS_SHORT]
            ,[ORDER_WAIT_PLAN]
            ,[ORDER_WAIT_CLOSEPICK]
            ,[ORDER_WAIT_CHECK]
            ,[ORDER_WAIT_RTS]
            ,[ORDER_WAIT_OB]
            ,[ORDER_WAIT_COURIER]
            ,[ORDER_COURIER_RECEIVE]
            ,[ORDER_CANCEL]
            ,[PROCESS_DATE]
        FROM [10.26.1.11].[TSDC_Conveyor].[dbo].[TSDC_ORDER_TRACKING_INTERNAL_BY_COMPANY]
        where ORDER_DATE is not null
        ${condition_date || ''}
        ${condition_Processdate || ''}
        ${condition_company || ''}
        ORDER BY PROCESS_DATE,ORDER_DATE,COMPANY,WORK_TYPE DESC


       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/Moniter_TrackingOrderInternal_Detail', function (req, res) {
    var fromdata = req.body;

    const queryMap = {
        ORDER_WAIT_PROCESS_MANHT: {
            table: "[10.26.1.11].[TSDC_Conveyor].[dbo].[TSDC_ORDER_TRACKING_INTERNAL_WAIT_PROCESS]",
            select: "COMPANY, SHOPID_OOH AS SHOP_ID,SHOP_NAME, CONVERT(VARCHAR(10), ORDER_DATE, 105) AS ORDER_DATE, ORDER_COUNT,WORK_TRACKING AS STATUS",
            whereCompany: "COMPANY",
            whereDate: "ORDER_DATE",
            whereWorktype: "WORK_TRACKING"
        },
        ORDER_WAIT_PROCESS_SHORT: {
            table: "[10.26.1.11].[TSDC_Conveyor].[dbo].[TSDC_ORDER_TRACKING_INTERNAL_WAIT_PROCESS]",
            select: "COMPANY, SHOPID_OOH as SHOP_ID,SHOP_NAME, CONVERT(VARCHAR(10), ORDER_DATE, 105) AS ORDER_DATE, ORDER_COUNT,WORK_TRACKING AS STATUS",
            whereCompany: "COMPANY",
            whereDate: "ORDER_DATE",
            whereWorktype: "WORK_TRACKING"
        },

        ORDER_WAIT_PLAN: {
            table: "[10.26.1.11].[TSDC_Conveyor].[dbo].[TSDC_ORDER_TRACKING_INTERNAL_WAIT_PLAN]",
            select: "COMPANY, SHOPID_OOH AS SHOP_ID,SHOP_NAME, CONVERT(VARCHAR(10), ORDER_DATE, 105) AS ORDER_DATE, MANHT_DATE,ORDER_NO,WORK_TYPE AS PERIOD",
            whereCompany: "COMPANY",
            whereDate: "ORDER_DATE",
            whereWorktype: "WORK_TYPE"
        },
        ORDER_WAIT_CLOSEPICK: {
            table: "[10.26.1.11].[TSDC_Conveyor].[dbo].[TSDC_ORDER_TRACKING_INTERNAL_WAIT_CLOSE_PICK]",
            select: "COMPANY, SHOPID_OOH AS SHOP_ID,SHOP_NAME, CONVERT(VARCHAR(10), ORDER_DATE, 105) AS ORDER_DATE, ZONE_PICK,ORDER_NO,CONTAINER_ID,WORK_TYPE AS PERIOD",
            whereCompany: "COMPANY",
            whereDate: "ORDER_DATE",
            whereWorktype: "WORK_TYPE"
        },
        ORDER_WAIT_CHECK: {
            table: "[10.26.1.11].[TSDC_Conveyor].[dbo].[TSDC_ORDER_TRACKING_INTERNAL_WAIT_CHECK]",
            select: "COMPANY, SHOPID_OOH AS SHOP_ID,SHOP_NAME, CONVERT(VARCHAR(10), ORDER_DATE, 105) AS ORDER_DATE, ZONE_PICK,ORDER_NO,CONTAINER_ID,WORK_TYPE AS PERIOD",
            whereCompany: "COMPANY",
            whereDate: "ORDER_DATE",
            whereWorktype: "WORK_TYPE"
        },
        ORDER_WAIT_RTS: {
            table: "[10.26.1.11].[TSDC_Conveyor].[dbo].[TSDC_ORDER_TRACKING_INTERNAL_WAIT_RTS]",
            select: "COMPANY, SHOPID_OOH AS SHOP_ID,SHOP_NAME, CONVERT(VARCHAR(10), ORDER_DATE, 105) AS ORDER_DATE, ORDER_COUNT,WORK_TYPE AS PERIOD",
            whereCompany: "COMPANY",
            whereDate: "ORDER_DATE",
            whereWorktype: "WORK_TYPE"
        },

        ORDER_WAIT_OUTBOUND: {
            table: "[10.26.1.11].[TSDC_Conveyor].[dbo].[TSDC_ORDER_TRACKING_INTERNAL_WAIT_OUTBOUND]",
            select: "COMPANY, SHOPID_OOH AS SHOP_ID,SHOP_NAME, CONVERT(VARCHAR(10), ORDER_DATE, 105) AS ORDER_DATE,TRANSPORT, ORDER_COUNT,WORK_TYPE AS PERIOD",
            whereCompany: "COMPANY",
            whereDate: "ORDER_DATE",
            whereWorktype: "WORK_TYPE"
        },
        ORDER_WAIT_COURIER: {
            table: "[10.26.1.11].[TSDC_Conveyor].[dbo].[TSDC_ORDER_TRACKING_INTERNAL_WAIT_COURIER_REC]",
            select: "TRANSPORT,COMPANY, SHOPID_OOH AS SHOP_ID,SHOP_NAME, CONVERT(VARCHAR(10), ORDER_DATE, 105) AS ORDER_DATE, ORDER_COUNT,WORK_TYPE AS PERIOD",
            whereCompany: "COMPANY",
            whereDate: "ORDER_DATE",
            whereWorktype: "WORK_TYPE"
        },
        ORDER_COURIER_RECEIVE: {
            table: "[10.26.1.11].[TSDC_Conveyor].[dbo].[TSDC_ORDER_TRACKING_INTERNAL_COURIER_REC]",
            select: "COMPANY, SHOPID_OOH AS SHOP_ID,SHOP_NAME, CONVERT(VARCHAR(10), ORDER_DATE, 105) AS ORDER_DATE,TRANSPORT, ORDER_COUNT,WORK_TYPE AS PERIOD",
            whereCompany: "COMPANY",
            whereDate: "ORDER_DATE",
            whereWorktype: "WORK_TYPE"
        },
        ORDER_CANCEL: {
            table: "[10.26.1.11].[TSDC_Conveyor].[dbo].[TSDC_ORDER_TRACKING_INTERNAL_ORDER_CANCEL]",
            select: "COMPANY, SHOPID_OOH AS SHOP_ID,SHOP_NAME, CONVERT(VARCHAR(10), ORDER_DATE, 105) AS ORDER_DATE,ORDER_NO,WORK_PERIOD AS PERIOD",
            whereCompany: "COMPANY",
            whereDate: "ORDER_DATE",
            whereWorktype: "WORK_PERIOD"
        }

    };

    const config = queryMap[fromdata.type];
    if (!config) {
        return res.json({ status: "error", message: "Invalid type" });
    }

    new sql.ConnectionPool(db).connect().then(pool => {

        const condition_date = fromdata.date
            ? ` AND ${config.whereDate} = '${fromdata.date}' `
            : '';

        const condition_company = fromdata.company
            ? ` AND ${config.whereCompany} = '${fromdata.company}' `
            : '';

        const condition_worktype = fromdata.worktype
            ? ` AND ${config.whereWorktype} = '${fromdata.worktype}' `
            : '';

        var query = `
            SELECT ${config.select}
            FROM ${config.table}
            WHERE 1 = 1
            ${condition_date}
            ${condition_company}
            ${condition_worktype}


       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

////////////////// Tsuruha
app.get('/tsuruha_get_channel', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        
        select distinct channel,work_period from [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_CONTROL_PICK_TSURUHA_HEADER order by channel,work_period 
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.get('/tsuruha_get_lastprocess', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        
        select top 1 * from  [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_CONTROL_PICK_TSURUHA_HEADER_LOG_PROCESS
        order by TSRH_PROCESS_DATE desc
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});


app.get('/tsuruha_process_job_TSRH_A5', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        
        EXEC [10.26.1.11].[TSDC_Conveyor].dbo.[TSDC_PROCESS_JOB_TSRH_A5]
       `;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/tsuruha_get_orderdetail', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        const condition_channel = fromdata.channel
            ? ` AND Channel = '${fromdata.channel}' `
            : '';

        const condition_period = fromdata.period
            ? ` AND work_period = '${fromdata.period}' `
            : '';

        const condition_date = fromdata.date
            ? ` H.Manht_process_date  = '${fromdata.date}'`
            : ` H.Manht_process_date between '${fromdata.datef}' and '${fromdata.datet}'`;


        var query = `        
        
        select  H.ORDER_DATE,H.CHANNEL,H.ORDER_NUMBER,H.TSRH_AMT,D.ITEM,D.ITEM_NAME,D.ITEM_BARCODE,D.TOTAL_QTY,D.TSRH_SKU_AMT ,H.TSRH_INVNO,H.TRACKING_NO,RTS_STATUS,H.WORK_PERIOD,H.Manht_process_date
        ,M.TSRH_VOIDNO,M.INV_DATE,M.VOID_DATE,M.VOID_AMT
        from [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_CONTROL_PICK_TSURUHA_HEADER H
        inner join [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_CONTROL_PICK_TSURUHA_DETAIL D
        on H.order_number = D.order_number
        OUTER APPLY (
            SELECT TOP 1 TSRH_VOIDNO,INV_DATE,VOID_DATE,VOID_AMT
            FROM [10.26.1.11].[TSDC_Conveyor].dbo.TSURUHA_INVOICE_MAPPING M
            WHERE M.ORDER_NUMBER = H.order_number
            and M.TSRH_INVNO = H.TSRH_INVNO
            ORDER BY M.UPDATE_VOIDNO_DATE DESC   
        ) M
        where ${condition_date}
        ${condition_channel} ${condition_period}
        order by H.order_number,D.Item

        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/tsuruha_get_orderdetail_invhistory', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        const condition_date = fromdata.date
            ? ` H.Manht_process_date  = '${fromdata.date}'`
            : ` H.Manht_process_date between '${fromdata.datef}' and '${fromdata.datet}'`;

        const condition_channel = fromdata.channel
            ? ` AND Channel = '${fromdata.channel}' `
            : '';

        const condition_period = fromdata.period
            ? ` AND work_period = '${fromdata.period}' `
            : '';

        var query = `        
        
        select  H.ORDER_NUMBER,H.ORDER_DATE,H.CHANNEL,M.TSRH_INVNO,M.CREATE_DATE,M.TSRH_VOIDNO,M.UPDATE_VOIDNO_DATE,M.REMARK,H.TRACKING_NO,RTS_STATUS,H.WORK_PERIOD,H.Manht_process_date
        ,m.INV_DATE,m.VOID_DATE,m.VOID_AMT
        from [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_CONTROL_PICK_TSURUHA_HEADER H
        left join [10.26.1.11].[TSDC_Conveyor].dbo.TSURUHA_INVOICE_MAPPING m
        on m.ORDER_NUMBER = h.order_number
        where ${condition_date}
        ${condition_channel} ${condition_period}
        order by H.order_number,M.CREATE_DATE

        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/tsuruha_check_order', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `       
        SELECT  H.ORDER_DATE,H.CHANNEL,H.ORDER_NUMBER,H.TSRH_AMT,H.TSRH_INVNO,H.TRACKING_NO,RTS_STATUS,H.WORK_PERIOD
        ,H.Manht_process_date, m.TSRH_VOIDNO,m.INV_DATE,m.VOID_DATE
        FROM [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_CONTROL_PICK_TSURUHA_HEADER h
        OUTER APPLY (
            SELECT TOP 1 TSRH_VOIDNO,INV_DATE,VOID_DATE
            FROM [10.26.1.11].[TSDC_Conveyor].dbo.TSURUHA_INVOICE_MAPPING m
            WHERE m.ORDER_NUMBER = h.order_number
            and m.TSRH_INVNO = h.TSRH_INVNO
            ORDER BY m.UPDATE_VOIDNO_DATE DESC   
        ) m
        where h.order_number  = '${fromdata.orderno}'
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/tsuruha_check_invoice', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `       

        select * from [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_CONTROL_PICK_TSURUHA_HEADER
        where TSRH_INVNO  = '${fromdata.invno}'
        and ORDER_NUMBER != '${fromdata.orderno}'

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/tsuruha_update_invoice', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        const remark = fromdata.remark
            ? ` ,REMARK = '${fromdata.remark}' `
            : '';

        var query = `  

        update [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_CONTROL_PICK_TSURUHA_HEADER
        set TSRH_INVNO = '${fromdata.invno}'
        ,update_date = getdate()
        ,TSRH_VOIDNO = CASE 
                WHEN TSRH_INVNO <> '${fromdata.invno}' THEN ''
                ELSE TSRH_VOIDNO
             END
        where order_number ='${fromdata.orderno}'

        update [10.26.1.11].[TSDC_Conveyor].dbo.TSURUHA_INVOICE_MAPPING
        set update_date = getdate()
        ${remark}
        where order_number ='${fromdata.orderno}'
        and TSRH_INVNO = '${fromdata.old_invno}'

     `;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/tsuruha_cancel_invoice', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  

        update [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_CONTROL_PICK_TSURUHA_HEADER
        set TSRH_INVNO = '${fromdata.invno}'
        ,update_date = getdate()
        ,TSRH_VOIDNO = CASE 
                WHEN TSRH_INVNO <> '${fromdata.invno}' THEN ''
                ELSE TSRH_VOIDNO
             END
        where order_number ='${fromdata.orderno}'

        delete [10.26.1.11].[TSDC_Conveyor].dbo.TSURUHA_INVOICE_MAPPING
        where order_number ='${fromdata.orderno}'
        and TSRH_INVNO = '${fromdata.old_invno}'

     `;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/tsuruha_history_invoice', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        const inv_date = fromdata.invdate
            ? ` ,'${fromdata.invdate}' `
            : '';

        var query = `  

        INSERT INTO [10.26.1.11].[TSDC_Conveyor].dbo.[TSURUHA_INVOICE_MAPPING]
        ([ORDER_NUMBER]
        ,[TSRH_INVNO]
        ,[REMARK]
        ,[CREATE_DATE]
        ,[UPDATE_DATE]
        ,[UPDATE_BY]
        ,[INV_DATE]
        )
  VALUES
        ('${fromdata.orderno}'
        ,'${fromdata.invno}'
        ,NULL
        ,getdate()
        ,NULL
        ,NULL
        ${inv_date})
   
     `;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/tsuruha_get_history_invoice', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `       

        select a.*,b.CHANNEL,b.RTS_STATUS,b.TRACKING_NO from [10.26.1.11].[TSDC_Conveyor].dbo.TSURUHA_INVOICE_MAPPING a
        left join [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_CONTROL_PICK_TSURUHA_HEADER b 
        on a.ORDER_NUMBER = b.ORDER_NUMBER
        where a.ORDER_NUMBER  = '${fromdata.orderno}'
        and a.TSRH_INVNO = '${fromdata.invno}'

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/tsuruha_check_void', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `       

        select * from [10.26.1.11].[TSDC_Conveyor].dbo.TSURUHA_INVOICE_MAPPING
        where TSRH_VOIDNO  = '${fromdata.voidno}'
        and TSRH_INVNO != '${fromdata.invno}'

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/tsuruha_update_void', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        const void_date = fromdata.voiddate
            ? ` ,VOID_DATE = '${fromdata.voiddate}' `
            : '';

        const remark = fromdata.remark
            ? ` ,REMARK = '${fromdata.remark}' `
            : '';

        const void_amt = fromdata.void_amt
            ? ` ,VOID_AMT = ${fromdata.void_amt} `
            : '';

        var query = `  

        update [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_CONTROL_PICK_TSURUHA_HEADER
        set TSRH_VOIDNO = '${fromdata.voidno}'
        where order_number ='${fromdata.orderno}'
        and TSRH_INVNO = '${fromdata.invno}'

        update [10.26.1.11].[TSDC_Conveyor].dbo.TSURUHA_INVOICE_MAPPING
        set UPDATE_VOIDNO_DATE = getdate()
        ,TSRH_VOIDNO = '${fromdata.voidno}'
        ${void_date}
        ${remark}
        ${void_amt}
        where order_number ='${fromdata.orderno}'
        and TSRH_INVNO = '${fromdata.invno}'
   
     `;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});
//////////////////////report packinglist//////////////////
app.post('/packinglist_header', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        const condition_checkdate = fromdata.date
            ? ` AND FORMAT(CHECK_DATE,'yyyy-MM-dd') = '${fromdata.date}' `
            : '';

        const condition_order = fromdata.orderno
            ? ` AND A.SHIPMENT_ID like '%${fromdata.orderno}%' `
            : '';

        const condition_PO = fromdata.orderno
            ? ` AND PO_NO like '%${fromdata.orderno}%' `
            : '';

        var query = `        
        
        select * from
        (
                     SELECT 
                        A.SHIPMENT_ID,
                        A.SELLER_NO,
                        SUM(QTY_PICK) AS SUM_QTY_PICK,
                        SUM(QTY_Check) AS SUM_QTY_CHECK
                    FROM  TSDC_PICK_CHECK_NEW A
                    where  EXISTS (
                        SELECT 1 
                        FROM TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW B
                        WHERE B.PO_NO = A.SHIPMENT_ID
                    ) AND (A.SHIPMENT_ID like 'ATH%')
                    ${condition_checkdate} ${condition_order}
                    group by  A.SHIPMENT_ID,
                        A.SELLER_NO
        ) as pick_check 
        Left join  
        (
        select H.PO_NO,
                   COUNT(H.REF_INDEX) COUNT_BOX,
                   sum(H.QTY) as SUM_QTY_CloseBOX,
                   CASE 
                        WHEN C.SHIPMENT_ID IS NOT NULL THEN 'true'
                        ELSE 'false'
                    END AS STATUS_CONFIRM,
                    CONVERT(VARCHAR(10), C.CONFIRM_DATE, 103) + ' ' +
                        LEFT(CONVERT(VARCHAR(8), C.CONFIRM_DATE, 108), 5) 
                    AS CONFIRM_DATE,
                    C.USER_CONFIRM
            from  TSDC_PICK_CHECK_BOX_CONTROL_NEW H
            LEFT JOIN 
                   TSDC_COMFIRM_PACKINGLIST C
                    ON H.PO_NO = C.SHIPMENT_ID
                    and H.REF_INDEX = C.REF_INDEX
        
            where VAS_NAME_10 != 'C'
             AND (H.PO_NO like 'ATH%')
             ${condition_PO}
            group by H.PO_NO 
            ,H.SELLER_NO
            ,C.SHIPMENT_ID
            ,C.CONFIRM_DATE
            ,C.USER_CONFIRM
        ) as BOX_CONTROL
        on pick_check.SHIPMENT_ID = BOX_CONTROL.PO_NO
        order by pick_check.SHIPMENT_ID

        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/packinglist_detail', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        
        
        SELECT 
            ROW_NUMBER() OVER (
                ORDER BY 
                    TRY_CAST(B.BOX_NO_ORDER AS INT), 
                    A.ITEM_ID, 
                    A.SHIPMENT_ID
            ) AS NO,
            A.SHIPMENT_ID, 
            H.REF_INDEX,
            TRY_CAST(B.BOX_NO_ORDER AS INT) AS BOX_NO_ORDER_INT,
            B.ITEM_ID, 
            B.ITEM_ID_BARCODE, 
            A.ITEM_DESC, 
            B.QTY,
            B.BOX_SIZE,
            B.TABLE_CHECK,
            B.USER_CHECK
            FROM 
            TSDC_PICK_CHECK_NEW A
            JOIN TSDC_PICK_CHECK_BOX_CONTROL_NEW H
                ON A.SHIPMENT_ID = H.PO_NO
            JOIN 
                [TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW] B 
                ON  H.PO_NO = B.PO_NO 
                AND H.REF_INDEX = B.REF_INDEX
                AND A.ITEM_ID = B.ITEM_ID
            WHERE A.SHIPMENT_ID = '${fromdata.SHIPMENT_ID}'
            and VAS_NAME_10 != 'C'
            ORDER BY BOX_NO_ORDER_INT,ITEM_ID;

        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/confirm_packinglist_header', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        const user_confirm = fromdata.userid
            ? `${fromdata.userid} `
            : '';

        var query = `  

        INSERT INTO [dbo].[TSDC_ATMA_ORDER_HD]
                ([FTCustomer_id]
                ,[FTShop_id]
                ,[FTOrdernumber]
                ,[FTCarton_id]
                ,[FTAlternate_carton_id]
                ,[FTSource_site]
                ,[FTDestination_site]
                ,[FTDelivery_note_number]
                ,[FTPurchaseOrderNumber]
                ,[FTBusiness_location]
                ,[FTRead_point]
                ,[FNAudit_type]
                ,[FDCarton_createdate]
                ,[FNTotal_Item]
                ,[FNTotal_qty]
                ,[FTProcess_type]
                ,[FDCreatedate]
                ,[FDLastupdate]
                ,[FNSta_sync]
                ,[FNSta_upload]
                ,[FTSta_sync_desc]
                ,[FTSta_upload_desc])
        select     
                'ATH'
                ,SELLER_NO
                ,PO_NO
                ,REF_INDEX
                ,''
                ,'5272'
                ,'TH23'
                ,PO_NO
                ,PO_NO
                ,'Tsdc Store'
                ,''
                ,'0'
                ,CREATE_DATE
                ,(select COUNT(ITEM_ID) from TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW D
                    where PO_NO = '${fromdata.SHIPMENT_ID}'
                    and H.REF_INDEX = D.REF_INDEX
                    and VAS_NAME_10 != 'C'
                ) as Total_item
                ,QTY
                ,'Audit'
                ,getdate()
                ,''
                ,'0'
                ,'0'
                ,''
                ,''
                
        from TSDC_PICK_CHECK_BOX_CONTROL_NEW H
        where PO_NO = '${fromdata.SHIPMENT_ID}'
        and VAS_NAME_10 != 'C'

        INSERT INTO [dbo].[TSDC_COMFIRM_PACKINGLIST]
                ([SHIPMENT_ID]
                ,[SELLER_NO]
                ,[REF_INDEX]
                ,[TOTAL_ITEM]
                ,[QTY]
                ,[CONFIRM_DATE]
                ,[USER_CONFIRM])
        select 
                PO_NO
                ,[SELLER_NO]
                ,[REF_INDEX]
                ,(select COUNT(ITEM_ID) from TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW D
                    where PO_NO = '${fromdata.SHIPMENT_ID}'
                    and H.REF_INDEX = D.REF_INDEX
                    and VAS_NAME_10 != 'C'
                ) as Total_item
                ,[QTY]
                ,getdate()
                ,'${user_confirm}'

        from TSDC_PICK_CHECK_BOX_CONTROL_NEW H
        where PO_NO = '${fromdata.SHIPMENT_ID}'
        and VAS_NAME_10 != 'C'
   
     `;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/confirm_packinglist_detail', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  

        INSERT INTO [dbo].[TSDC_ATMA_ORDER_ITEM]
                ([FTCustomer_id]
                ,[FTShop_id]
                ,[FTOrdernumber]
                ,[FTCarton_id]
                ,[FNSeq]
                ,[FTProduct_type]
                ,[FTProduct_value]
                ,[FNQty]
                ,[FDCreatedate]
                ,[FDLastupdate])
        select 
                'ATH'
                ,H.SELLER_NO
                ,H.PO_NO
                ,H.REF_INDEX
                ,ROW_NUMBER() OVER (PARTITION BY D.REF_INDEX  ORDER BY D.REF_INDEX,D.ITEM_ID ) as SEQ
                ,'GTIN'
                ,D.ITEM_ID_BARCODE
                ,D.QTY
                ,getdate()
                ,''

                from TSDC_PICK_CHECK_BOX_CONTROL_NEW H
                inner join TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW D
                on H.REF_INDEX = D.REF_INDEX
                where H.PO_NO = '${fromdata.SHIPMENT_ID}'
                and H.PO_NO = D.PO_NO
                and VAS_NAME_10 != 'C'
                order by REF_INDEX

     `;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

/////////////////

app.post('/Get_MANHT_PICK_PAPER', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        
        
        select LAUNCH_NUM,REFERENCE_ID,sum(QUANTITY) as Total_QTY,TYPE_PICK,TYPE_PICK_DESC,STATUS_PRINT,format ( getdate() ,'dd-MM-yyyy HH:mm:ss') as GETDATEDATE
        from [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_MANHT_PICK_PAPER
        where  LAUNCH_NUM = '${fromdata.waveno}'
        group by LAUNCH_NUM,REFERENCE_ID,TYPE_PICK,TYPE_PICK_DESC,STATUS_PRINT

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/Get_ITEM_LOCATION_MANHT_PICK_PAPER', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        const condition_TYPE_PICK = fromdata.type
            ? ` AND TYPE_PICK =  '${fromdata.type}' `
            : '';

        var query = `        
        
        select LAUNCH_NUM,ITEM,sum(QUANTITY) as Total_QTY,FROM_LOC
        from [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_MANHT_PICK_PAPER
        where  LAUNCH_NUM = '${fromdata.waveno}' ${condition_TYPE_PICK}
        group by LAUNCH_NUM,ITEM,FROM_LOC
        order by  FROM_LOC,ITEM

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/Update_MANHT_PICK_PAPER', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        const condition_TYPE_PICK = fromdata.type
            ? ` AND TYPE_PICK =  '${fromdata.type}' `
            : '';

        var query = `        
        
        update [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_MANHT_PICK_PAPER
        set STATUS_PRINT = 'Y'
        ,PROCRESS_DATE = getdate()
        where  LAUNCH_NUM = '${fromdata.waveno}' ${condition_TYPE_PICK}
         

       `;
        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});


app.post('/Get_OrderCountConfirmMan_PICK_PAPER', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        
        
            select top 1 c.order_count as order_count_confirm ,count(distinct REFERENCE_ID) order_count
            from [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_MANHT_PICK_PAPER_CONFIRM_PRINT C
            inner join [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_MANHT_PICK_PAPER P
            on C.LAUNCH_NUM = P.LAUNCH_NUM
            where C.LAUNCH_NUM = '${fromdata.waveno}'
            group by C.order_count

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});


////////
app.get('/Get_PendingPrint_WaveOrderList', function (req, res) {
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
                SELECT
                P.LAUNCH_NUM,
                COUNT(DISTINCT P.REFERENCE_ID)                                        AS ORDER_COUNT,
                SUM(P.quantity)                                                      AS TOTAL_QTY,
                COUNT(DISTINCT CASE WHEN P.STATUS_PRINT = 'Y' THEN P.REFERENCE_ID END) AS PRINTED_COUNT,
                COUNT(DISTINCT CASE WHEN P.STATUS_PRINT = 'N' THEN P.REFERENCE_ID END) AS UNPRINT_COUNT
            FROM [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_MANHT_PICK_PAPER P
            GROUP BY P.LAUNCH_NUM
            HAVING COUNT(DISTINCT CASE WHEN P.STATUS_PRINT = 'N' THEN P.REFERENCE_ID END) > 0
            ORDER BY P.LAUNCH_NUM DESC
        `;

        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (data.length === 0) {
                    dataout = { status: 'null' };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/Cancel_PendingPrint_WaveOrder', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        const condition_TYPE_PICK = fromdata.type
            ? ` AND TYPE_PICK =  '${fromdata.type}' `
            : '';

        var query = `        
        
        update [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_MANHT_PICK_PAPER
        set STATUS_PRINT = 'Y'
        ,PROCRESS_DATE = getdate()
        where  LAUNCH_NUM = '${fromdata.waveno}' ${condition_TYPE_PICK}
        and STATUS_PRINT = 'N'
         

       `;
        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/report_pallet_outbound', function (req, res) {
    var fromdata = req.body;
    var fromdata = req.body;

    const conditions = [];

    if (fromdata.Tracking_No) {
        conditions.push(`(t.BILL_NO like '%${fromdata.Tracking_No}%')`);
    }

    if (fromdata.Pallet_NO) {
        conditions.push(`(t.PALLET_NO = '${fromdata.Pallet_NO}' AND CONVERT(date, t.scandate) = '${fromdata.report_date}')`);
    }

    // ถ้าไม่ส่งอะไรมาเลย ให้ return ว่างไปเลย ไม่ต้อง query ทั้งตาราง
    const whereClause = conditions.length > 0 ? conditions.join(' OR ') : '1=0';

    new sql.ConnectionPool(db).connect().then(pool => {
        var query = `
        SELECT
            ROW_NUMBER() OVER (ORDER BY t.scandate ASC) AS ID,
            t.*
        FROM (
            SELECT
                l.PALLET_NO, l.BILL_NO, l.ORDER_NO, l.SHIP_PROVIDER_OOD,
                CONVERT(varchar,l.CREATE_DATE ,121) as scandate, l.PIN_ID,
                CASE WHEN l.STATUS_DELIVERY = 'S' OR r.STATUS_DELIVERY = 'S' THEN 'S'
                    ELSE l.STATUS_DELIVERY END AS STATUS_DELIVERY,
                COALESCE(l.DELIVERY_NO, r.DELIVERY_NO) AS DELIVERY_NO,
                COALESCE(l.DRIVER_NAME, r.DRIVER_NAME) AS DRIVER_NAME,
                COALESCE(l.DRIVER_SIGNATURE, r.DRIVER_SIGNATURE) AS DRIVER_SIGNATURE
            FROM TSDC_CONFIRM_OUTBOUND l
            LEFT JOIN [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_CONFIRM_OUTBOUND r
                ON l.BILL_NO = r.BILL_NO AND l.PALLET_NO = r.PALLET_NO
                AND (l.BILL_NO = r.BILL_NO OR l.BILL_NO IS NULL)

            UNION ALL

            SELECT
                r.PALLET_NO, r.BILL_NO, r.ORDER_NO, r.SHIP_PROVIDER_OOD,
                CONVERT(varchar,r.CREATE_DATE ,121) as scandate, r.PIN_ID,
                r.STATUS_DELIVERY,
                r.DELIVERY_NO, r.DRIVER_NAME, r.DRIVER_SIGNATURE
            FROM [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_CONFIRM_OUTBOUND r
            WHERE NOT EXISTS (
                SELECT 1 FROM TSDC_CONFIRM_OUTBOUND l
                WHERE l.BILL_NO = r.BILL_NO AND l.PALLET_NO = r.PALLET_NO
                and r.bill_no is not null
            )
        ) t
        WHERE ${whereClause}  And t.PALLET_NO is not null
        ORDER BY t.scandate ASC

        `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = { status: 'error', member: err_query, query: query };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (data.length === 0) {
                    dataout = { status: 'null' };
                } else {
                    dataout = { status: 'success', data: data };
                }
                res.json(dataout);
                sql.close();
            }
        });
    });
});

app.post('/delete_report_pallet_outbound', function (req, res) {
    var fromdata = req.body;
    new sql.ConnectionPool(db).connect().then(pool => {
        var query = `
        DELETE FROM TSDC_CONFIRM_OUTBOUND
        WHERE PALLET_NO = '${fromdata.Pallet_NO}'
        AND BILL_NO = '${fromdata.BILL_NO}'
        AND CONVERT(date, CREATE_DATE) = '${fromdata.report_date}'
        AND ISNULL(STATUS_DELIVERY, '') != 'S'

        EXEC('DELETE FROM [TSDC_CONVEYOR].[DBO].TSDC_CONFIRM_OUTBOUND WHERE PALLET_NO = ''${fromdata.Pallet_NO}'' AND BILL_NO = ''${fromdata.BILL_NO}'' AND CONVERT(date, CREATE_DATE) = ''${fromdata.report_date}'' AND ISNULL(STATUS_DELIVERY, '''') != ''S''') AT [10.26.1.11]
        `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = { status: 'error', data: err_query, query: query };
                res.json(dataout);
            } else {
                dataout = { status: 'success' };
                res.json(dataout);
                sql.close();
            }
        });
    });
});





app.post('/insert_video_hd', function (req, res) {
    var fromdata = req.body || {};
    var list = fromdata.VIDEO_LIST || [];

    if (!list.length) {
        return res.json({ status: 'error', message: 'VIDEO_LIST ว่าง ไม่มีไฟล์ให้บันทึก' });
    }

    // ใช้ parameter ไม่ต่อ string เพราะ FTPath เป็น path ของ Windows และชื่อไฟล์มาจากภายนอก
    //
    // upsert ยึด FTVideo_name เป็นกุญแจ (ชื่อไฟล์มี tablecheck+order+วัน+เวลา จึงไม่ซ้ำกันเอง)
    //   เริ่มอัด     : segment แรก sta 2 -> INSERT
    //   ตัด segment : ไฟล์ที่ปิดแล้ว sta 0 (UPDATE) + ไฟล์ใหม่ sta 2 (INSERT) มาในคำขอเดียวกัน
    //   อัดจบ       : ทุก segment เป็น 0 ตัวที่ปิดไปแล้วเป็น UPDATE ซ้ำ ไม่มีผลเสีย
    // FDStartdate / FDCreatedate ไม่ถูกแตะตอน UPDATE เพราะเป็นเวลาที่ไฟล์นั้นเริ่มถูกเขียน
    // FDEnddate ว่าง = ไฟล์ยังเขียนไม่จบ ปล่อยคอลัมน์ไว้ตามเดิม
    var query = `
        DECLARE @updated int = 0, @inserted int = 0, @id bigint = NULL;

        UPDATE [TSDC_VIDEO_HD]
        SET [FDEnddate]    = CASE WHEN @FDEnddate = '' THEN [FDEnddate]
                                  ELSE CONVERT(datetime, @FDEnddate, 120) END
          , [FNStaUpload]  = @FNStaUpload
          , [FTStaDesc]    = @FTStaDesc
          , [FCFile_size]  = @FCFile_size
          , [FTVideo_name] = @FTVideo_name
          , [FTPath]       = @FTPath
          -- ข้อมูลพวกนี้รู้ทีหลังได้ เช่น tracking ที่เพิ่งถูกเลือกหลังจากเริ่มอัดไปแล้ว
          -- ถ้าไม่เขียนทับ แถวที่ insert ตอนเริ่มอัดจะค้างเป็นค่าว่างตลอดไป
          , [FTTracking_id]  = CASE WHEN @FTTracking_id  = '' THEN [FTTracking_id]  ELSE @FTTracking_id  END
          , [FTContainer_id] = CASE WHEN @FTContainer_id = '' THEN [FTContainer_id] ELSE @FTContainer_id END
          , [FTZone]         = CASE WHEN @FTZone         = '' THEN [FTZone]         ELSE @FTZone         END
          , [FDLastupdate] = GETDATE()
        WHERE [FTVideo_name] = @FTVideo_name_key;

        SET @updated = @@ROWCOUNT;

        -- คืน FNVideo_id ให้หน้าเว็บเอาไปตั้งเป็นส่วนหน้าของชื่อไฟล์ (660-P52-...)
        -- id เป็น IDENTITY จึงเพิ่งมีตัวตนตอน INSERT ส่วนไฟล์ถูก ffmpeg สร้างไปก่อนแล้ว
        -- หน้าเว็บจึงต้องรู้ id ก่อน แล้วค่อยสั่ง agent เปลี่ยนชื่อไฟล์ตามทีหลัง
        -- อ่านด้วย @FTVideo_name (ชื่อใหม่) เพราะ UPDATE ข้างบนเขียนชื่อใหม่ลงไปแล้ว
        IF @updated > 0
        BEGIN
            SELECT TOP 1 @id = [FNVideo_id]
            FROM [TSDC_VIDEO_HD]
            WHERE [FTVideo_name] = @FTVideo_name
            ORDER BY [FNVideo_id] DESC;
        END

        IF @updated = 0
        BEGIN
            INSERT INTO [TSDC_VIDEO_HD]
            ( [FTVideo_name], [FDStartdate], [FDEnddate], [FTTable_id], [FTZone]
            , [FTContainer_id], [FTOrder_number], [FTTracking_id], [FTPin_code]
            , [FDCreatedate], [FDLastupdate], [FNStaUpload], [FTStaDesc]
            , [FTUser_create], [FDUser_datetime], [FTPath], [FTIp_address_local], [FCFile_size] )
            VALUES
            ( @FTVideo_name
            , CONVERT(datetime, @FDStartdate, 120)
            , CASE WHEN @FDEnddate = '' THEN NULL ELSE CONVERT(datetime, @FDEnddate, 120) END
            , @FTTable_id, @FTZone
            , @FTContainer_id, @FTOrder_number, @FTTracking_id, @FTPin_code
            , GETDATE(), GETDATE(), @FNStaUpload, @FTStaDesc
            , @FTUser_create, GETDATE(), @FTPath, @FTIp_address_local, @FCFile_size );

            SET @inserted = @@ROWCOUNT;
            SET @id = CONVERT(bigint, SCOPE_IDENTITY());
        END

        SELECT @updated AS UPDATED, @inserted AS INSERTED, @id AS VIDEO_ID;
    `;

    new sql.ConnectionPool(db).connect().then(pool => {

        var inserted = 0;
        var updated = 0;
        var errors = [];
        // [{ FTVideo_name, FNVideo_id }] ของทุกแถวที่แตะในคำขอนี้ จับคู่ด้วยชื่อไฟล์
        var ids = [];

        function insertAt(i) {
            if (i >= list.length) {
                sql.close();
                return res.json({
                    status: errors.length ? 'error' : 'success',
                    inserted: inserted,
                    updated: updated,
                    message: errors.join(' | '),
                    ids: ids
                });
            }

            var f = list[i] || {};

            // ถ้าไฟล์ถูกเปลี่ยนชื่อตอนอัดจบ ให้หาแถวด้วยชื่อเดิม แล้วเขียนชื่อใหม่ทับลงไป
            var nameKey = String(f.FTVideo_name_old || f.FTVideo_name || '');

            pool.request()
                .input('FTVideo_name_key', sql.NVarChar, nameKey)
                .input('FTVideo_name', sql.NVarChar, String(f.FTVideo_name || ''))
                .input('FTPath', sql.NVarChar, String(f.FTPath || ''))
                .input('FCFile_size', sql.NVarChar, String(f.FCFile_size == null ? 0 : f.FCFile_size))
                // 4 ตัวนี้ต่างกันได้ในคำขอเดียว เช่นตอนตัด segment จะมีทั้งไฟล์ที่ปิดแล้ว (0) และไฟล์ใหม่ (2)
                .input('FDStartdate', sql.NVarChar, String(f.FDStartdate || ''))
                .input('FDEnddate', sql.NVarChar, String(f.FDEnddate || ''))
                .input('FNStaUpload', sql.NVarChar, String(f.FNStaUpload == null ? 0 : f.FNStaUpload))
                .input('FTStaDesc', sql.NVarChar, String(f.FTStaDesc || ''))
                .input('FTTable_id', sql.NVarChar, String(fromdata.FTTable_id || ''))
                .input('FTZone', sql.NVarChar, String(fromdata.FTZone || ''))
                .input('FTContainer_id', sql.NVarChar, String(fromdata.FTContainer_id || ''))
                .input('FTOrder_number', sql.NVarChar, String(fromdata.FTOrder_number || ''))
                .input('FTTracking_id', sql.NVarChar, String(fromdata.FTTracking_id || ''))
                .input('FTPin_code', sql.NVarChar, String(fromdata.FTPin_code || ''))
                .input('FTUser_create', sql.NVarChar, String(fromdata.FTUser_create || ''))
                .input('FTIp_address_local', sql.NVarChar, String(fromdata.FTIp_address_local || ''))
                .query(query, function (err_query, recordset) {
                    if (err_query) {
                        console.log('insert_video_hd error:', err_query.message);
                        errors.push(f.FTVideo_name + ': ' + err_query.message);
                    } else {
                        var rows = recordset && recordset.recordset ? recordset.recordset : [];
                        if (rows.length && rows[0].UPDATED > 0) {
                            updated++;
                        } else {
                            inserted++;
                        }
                        if (rows.length && rows[0].VIDEO_ID != null) {
                            // bigint ถูก driver คืนมาเป็น string เพื่อกันความแม่นยำหาย แปลงเป็นตัวเลขให้ JSON สะอาด
                            ids.push({ FTVideo_name: String(f.FTVideo_name || ''), FNVideo_id: Number(rows[0].VIDEO_ID) });
                        }
                    }
                    insertAt(i + 1);
                });
        }

        insertAt(0);

    }).catch(err => {
        console.log('insert_video_hd connect error:', err.message);
        res.json({ status: 'error', message: err.message });
    });
});

module.exports = app;