var express = require('express');
var sql = require('mssql');
var fs = require('fs');
var app = express.Router();
var bodyParser = require('body-parser');
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





app.post('/login', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    var query;
    console.log("USER LOGIN :" + fromdata.user_id);
    console.log("password LOGIN :" + fromdata.password);
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
    console.log("LOAD_USERTABLECHECK :");
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
    console.log('insert_user_tablecheck');
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
    console.log('insert_user_tablecheck2');
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
    console.log("load_checkinPack :");
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
    console.log("Checkorder_block :");
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



app.post('/CheckCon', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("CheckCon :");
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
    console.log("CheckConOnline :");
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
    console.log("CheckConOffline :");
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
    console.log("CheckConSorter :");
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
    console.log("summaryCon :");
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
     ,QTY_PICK ,BRAND,ITEM_DESC,UOM_PICK
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
    console.log("summaryConSorter :");
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
    console.log("matchItemInCon :");
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
    console.log("matchItemInConSORTER :");
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
    console.log("checkEqual :");
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
    console.log("checkEqualConSorter :");
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
    console.log('updateConQtyCheck');
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
     select CONTAINER_ID,ITEM_ID,QTY_CHECK,GETDATE(),'${fromdata.USER_NAME}' as USER_NAME ,SHIPMENT_ID ,'${fromdata.TABLE_CHECK}' as TABLE_CHECK from (
  
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
    console.log('updateCoverSheet');
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
    console.log('updateConQtyCheck_SORTER');
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
     select CONTAINER_ID,ITEM_ID,QTY_CHECK,GETDATE(),'${fromdata.USER_NAME}' as USER_NAME ,SHIPMENT_ID ,'${fromdata.TABLE_CHECK}' as TABLE_CHECK from (
  
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
    console.log('updateConQtyCheck_SORTER_fullcarton');
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
     select CONTAINER_ID,ITEM_ID,QTY_CHECK,GETDATE(),'${fromdata.USER_NAME}' as USER_NAME ,SHIPMENT_ID ,'${fromdata.TABLE_CHECK}' as TABLE_CHECK from (
  
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
    console.log('updateConQtyCheck_fullcarton');
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
     select CONTAINER_ID,ITEM_ID,QTY_CHECK,GETDATE(),'${fromdata.USER_NAME}' as USER_NAME,SHIPMENT_ID ,'${fromdata.TABLE_CHECK}' as TABLE_CHECK from (
  
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
                    set QTY = QTY+1
                    where   REF_INDEX is null
                    and TABLE_CHECK = '${fromdata.TABLE_CHECK}'
                    and PO_NO = '${fromdata.shipment_id}'
                    AND SELLER_NO = '${fromdata.SELLER_NO}'
                    and ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}' 
                    and QTY < '${fromdata.check_QTY_PICK}' 
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

app.post('/BOX_CONTROL_DETAIL_FULLCARTON', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("BOX_CONTROL_DETAIL_FULLCARTON :");
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
    console.log("checkEqual :");
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

        select sum(qty) as TRACKSUM_QTY
        from TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
        where   REF_INDEX is null
        and PO_NO = '${fromdata.shipment_id}'
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
    var Datenow = DateNow();
    console.log('tracking_running');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

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
                ,'TRANSPORT'
                ,'TRACKING'
                ,'SORTCODE'
                ,'SORTINGLINECODE'
                ,'STORENAME'
                ,'${fromdata.SHIPPING_NAME}'
                ,'CUST_ADDRESS'
                ,'CUST_TEL'
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
                ,'${fromdata.VAS_NAME_10}'
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
                    where  REF_INDEX is null
                    and PO_NO = '${fromdata.shipment_id}'
                    AND SELLER_NO = '${fromdata.SELLER_NO}'

                    
    
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
    console.log("loadTracking :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

        select *,(select    max(BOX_NO_ORDER)  MaxBox_NO
        from TSDC_PICK_CHECK_BOX_CONTROL_NEW
        where PO_NO  = '${fromdata.shipment_id}'
        AND SELLER_NO = '${fromdata.SELLER_NO}') as MaxBox_NO
         from TSDC_PICK_CHECK_BOX_CONTROL_NEW
        where po_no = '${fromdata.shipment_id}'
        and SELLER_NO =  '${fromdata.SELLER_NO}'
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
		set QTY_CHECK = QTY_CHECK - QTY
        ,CHECK_DATE = NULL
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

        select REF_INDEX
        ,QTY
        ,PO_NO
        ,SELLER_NO
        ,BOX_NO_ORDER
        ,BOX_SIZE
		,TABLE_CHECK
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
        select BOX_SIZE,REF_INDEX,a.PO_NO,SELLER_NO,QTY,BOX_NO_ORDER,TABLE_CHECK,CUST_NAME ,TCHANNEL,p.COMPANY, (FORMAT(ORDER_DATE,'dd-MM-yyyy')) ORDER_DATE
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
                var query =
                    `
                    select BOX_SIZE,REF_INDEX,PO_NO,SELLER_NO,QTY,BOX_NO_ORDER,TABLE_CHECK,CUST_NAME
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
            } else 
            {
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
                }else 
                {
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

                            
                            var query3 = `
                                    drop table #temp_NewTable
                                `;
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

        update [10.26.1.11].TSDC_Conveyor.dbo.TSDC_CONFIRM_OUTBOUND
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

                            
                            var query3 = `
                                    drop table #temp_NewTable
                                `;
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
            and CONVERT(date,CREATE_DATE) = CONVERT(date,getdate()) 
        ) and BILL_NO not in
		(
		Select BILL_NO From [10.26.1.11].TSDC_Conveyor.dbo.TSDC_CONFIRM_OUTBOUND
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
    });
});

module.exports = app;