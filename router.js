import express from 'express';
import {google} from 'googleapis';
import {config} from 'dotenv';
import { GoogleAdsApi, services, enums } from "google-ads-api";

config()

const router = express.Router();
const oauth2Client = new google.auth.OAuth2(
    process.env.OAUTH_CLIENT_ID,
    process.env.OAUTH_CLIENT_SECRET,
    process.env.OAUTH_REDIRECT_URI
  );

google.options({
    auth: oauth2Client
  });

global.tokens = null

oauth2Client.on('tokens', (_tokens) => {
    oauth2Client.setCredentials(_tokens);
    tokens = _tokens;
  });

const adClient = new GoogleAdsApi({
    client_id: process.env.OAUTH_CLIENT_ID,
    client_secret: process.env.OAUTH_CLIENT_SECRET,
    developer_token: process.env.DEVELOPER_TOKEN,
  });

//Handle Login / Registration via Google
router.get('/login', function (req, res) {
    if(tokens!=null && tokens.expiry_date > Date.now()){
        return res.redirect(""+process.env.LOGIN_REDIRECT_URI);  //Already Logged In
    }
    try{
        let query =  req.query;
        if('code' in query){
            oauth2Client.getToken(query.code).then(function(response){
                tokens = response.tokens;
                console.log(tokens);
                oauth2Client.setCredentials(tokens);
                return res.redirect(process.env.LOGIN_REDIRECT_URI);
            });
        }
        else{
            return res.end("Something went wrong. Try again");
        }
    }
    catch{
        return res.end("Something went wrong. Try again");
    }
 });

router.get('/login_uri', function (req, res) {
    if(tokens!=null && tokens.expiry_date > Date.now()){
        return res.end({logged_in:true, redirect_uri:process.env.LOGIN_REDIRECT_URI});  //Already Logged In
    }
    
    const scopes = [
        'https://www.googleapis.com/auth/adwords'
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
    });

    return res.end(JSON.stringify({logged_in:false, login_uri:url}));
 });

router.get('/',function (req, res) {
    return res.end("Hello there.");
 });

router.post('/keyword_ideas',function (req, res) {
      async function main() {
        const customer = adClient.Customer({
          customer_id: process.env.CUSTOMER_ID,
          refresh_token: tokens.refresh_token
        });

        const keywords = req.body.keywords;
        const url = req.body.url;
        const include_adult_keywords = true
        req.body.geo_target_constants.map((v,i,arr)=>{
            arr[i] = "geoTargetConstants/" + v.toString();
        });
        const geo_target_constants = req.body.geo_target_constants;
        const language = "languageConstants/" + req.body.language;
        const keyword_plan_network=enums.KeywordPlanNetwork.GOOGLE_SEARCH_AND_PARTNERS; 
        //enums.KeywordPlanNetwork.GOOGLE_SEARCH, enums.KeywordPlanNetwork.GOOGLE_SEARCH_AND_PARTNERS, 
        //enums.KeywordPlanNetwork.UNSPECIFIED, enums.KeywordPlanNetwork.UNKNOWN

        const aggregrate_metrics = [
            enums.KeywordPlanAggregateMetricType.UNSPECIFIED,
            enums.KeywordPlanAggregateMetricType.UNKNOWN,
            enums.KeywordPlanAggregateMetricType.DEVICE
        ]
        const year_month_range = req.body.year_month_range;
        const historical_metrics_options={
            include_average_cpc:true,
        }
        let ymr = {}
        if(year_month_range.start.year && year_month_range.start.month){
            ymr.start = year_month_range.start
        }
        if(year_month_range.end.year && year_month_range.end.month){
            ymr.end = year_month_range.end
        }
        if(Object.keys(ymr).length) historical_metrics_options.year_month_range = ymr;

        const keyword_request = {
            customer_id: customer.credentials.customer_id,
            page_size: 10000,
            include_adult_keywords:include_adult_keywords,
            keyword_plan_network:keyword_plan_network,
            aggregrate_metrics: aggregrate_metrics,
            historical_metrics_options:historical_metrics_options,            
        }

        if(geo_target_constants.length){
            keyword_request.geo_target_constants = geo_target_constants;
        }

        if(url==null){
            keyword_request.keyword_seed = new services.KeywordSeed({ keywords: keywords }); 
        }
        else{
            keyword_request.keyword_and_url_seed = new services.KeywordAndUrlSeed({
                keywords:keywords,
                url:url
            });
        }

        console.log(keyword_request)

        const keyword_ideas = await customer.keywordPlanIdeas.generateKeywordIdeas(keyword_request);
      
        return keyword_ideas;
      }
      
      main().then((response)=>{
        console.log(response.length);
        res.end(JSON.stringify({data:response}))
      }).catch((error)=>{
        console.error(error);
      });
 });

 export default router;