xquery version "1.0-ml";

module namespace ext = "http://marklogic.com/rest-api/resource/workplace";

import module namespace json = "http://marklogic.com/xdmp/json" at "/MarkLogic/json/json.xqy";

declare namespace roxy = "http://marklogic.com/roxy";

declare namespace rapi = "http://marklogic.com/rest-api";

(:
 : Exports all workplace pages as a single XML file in the current content database
 :)
declare
%roxy:params("")
function ext:get(
  $context as map:map,
  $params  as map:map
) as document-node()*
{


  map:put($context, "output-types", "text/xml"),
  xdmp:set-response-code(200, "OK"),

     document {
      <workplace>
       <pages>
        {
          for $page in fn:collection("/config/workplace/page")/node()
          (:
          let $_ := xdmp:log("WORKPLACE PAGE: " | xs:string(fn:base-uri($page)))
          let $_ := xdmp:log($page)
          :)
          return
           <page uri="{fn:base-uri($page)}">{json:transform-from-json($page)}</page>
        }
       </pages>
      </workplace>
    }
};

(:
 : Uploads workplace pages, complimenting those that already exist
 :)
declare
%roxy:params("")
%rapi:transaction-mode("update")
function ext:post(
    $context as map:map,
    $params  as map:map,
    $input   as document-node()*
) as document-node()*
{
let $_ := xdmp:log($input)
return
  (
    for $page in $input/workplace/pages/page
    let $_ := xdmp:log("page xml element:-")
    let $_ := xdmp:log($page)
    let $json := $page/node()
    let $_ := xdmp:log("JSON XML ELEMENT:-")
    let $_ := xdmp:log($json)
    let $j := json:transform-to-json($json)
    let $_ := xdmp:log("JSON converted from xml:-")
    let $_ := xdmp:log($j)
    return
      xdmp:document-insert(xs:string($page/@uri),$j,xdmp:default-permissions(),("mljsInternalData","mljsWorkplacePages","/config/workplace/page",xdmp:default-collections()))
  )
  ,
  map:put($context, "output-types", "application/json"),
  xdmp:set-response-code(200, "OK"),
  document { "PUT called on workplace configuration" }
};
