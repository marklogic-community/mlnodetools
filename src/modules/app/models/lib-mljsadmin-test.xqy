xquery version "1.0-ml";

module namespace m="http://marklogic.com/mljsadmin/test";

declare function m:test($str as xs:string) as xs:boolean {
  return fn:true();
};
