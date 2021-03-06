import {Injectable} from '@angular/core';
import {Http, Headers, Response} from '@angular/http';

import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/catch';
import {Observable} from 'rxjs/Rx';
import * as moment from "moment";

import {GlobalService} from '../global.service';
import {UserService} from './user.service';
import {Timesheet} from './timesheet';
import {StaffTimesheet} from "./staff-timesheet";

@Injectable()
export class TimesheetDataService {

    constructor(private _http:Http,
                private _globalService:GlobalService,
                private _userService:UserService){
    }

    // POST /v1/timesheet
    addTimesheet(timesheet:Timesheet):Observable<any>{
        let headers = this.getHeaders();

        return this._http.post(
                this._globalService.apiHost+'/timesheet',
                JSON.stringify(timesheet),
                {
                    headers: headers
                }
            )
            .map(response => response.json())
            .map((response) => {
                return response;
            })
            .catch(this.handleError);
    }

    // DELETE /v1/timesheet/1
    deleteTimesheetById(id:number):Observable<boolean>{
        let headers = this.getHeaders();

        return this._http.delete(
                this._globalService.apiHost+'/timesheet/'+id,
                {
                    headers: headers
                }
            )
            .map(response => response.json())
            .map((response) => {
                return response;
            })
            .catch(this.handleError);
    }

    // PUT /v1/timesheet/1
    updateTimesheetById(timesheet:Timesheet):Observable<any>{
        let headers = this.getHeaders();

        return this._http.put(
                this._globalService.apiHost+'/timesheet/'+timesheet.id,
                JSON.stringify(timesheet),
                {
                    headers: headers
                }
            )
            .map(response => response.json())
            .map((response) => {
                return response;
            })
            .catch(this.handleError);
    }

    private getHeaders():Headers {
        return new Headers({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer '+this._userService.getAccessToken(),
        });
    }

    // GET /v1/timesheet
    getAllTimesheets(): Observable<Timesheet[]> {
        let headers = this.getHeaders();

        return this._http.get(
            this._globalService.apiHost+'/timesheet?sort=-update_time',
                {
                    headers: headers
                }
            )
            .map(response => response.json())
            .map((response) => {
                return <Timesheet[]>response.data;
            })
            .catch(this.handleError);
    }

    // GET /v1/timesheet/staff
    getStaffsForTimesheet():Observable<StaffTimesheet[]> {
        let headers = this.getHeaders();

        return this._http.get(
            this._globalService.apiHost+'/timesheet/staff',
                {
                    headers: headers
                }
            )
            .map(response => response.json())
            .map((response) => {
                return <StaffTimesheet[]>response.data;
            })
            .catch(this.handleError);
    }

    // GET /v1/timesheet/1
    getTimesheetById(id:number):Observable<Timesheet> {
        let headers = this.getHeaders();

        return this._http.get(
            this._globalService.apiHost+'/timesheet/'+id,
                {
                    headers: headers
                }
            )
            .map(response => response.json())
            .map((response) => {
                return <Timesheet>response.data;
            })
            .catch(this.handleError);
    }

    private handleError (error: Response | any) {

        let errorMessage:any = {};
        // Connection error
        if(error.status == 0) {
            errorMessage = {
                success: false,
                status: 0,
                data: "Sorry, there was a connection error occurred. Please try again.",
            };
        }
        else {
            errorMessage = error.json();
        }
        return Observable.throw(errorMessage);
    }

    /**
     * Calculate start/finish date time based on configuration
     *      - rounding_mode: 1 for rounding down, 2 for rounding off, 3 for median rounding down/off
     *      - rounding_times: 15
     *
     * @param mode for calculating start or finish date/time
     * @param baseTime to provide base time for calculation. can be empty
     * @return moment
     */
    calculateTimesheet(mode:string, baseTime:string) {
        let time:any;
        if(baseTime == '') {
            time = moment();
        } else {
            time = moment(baseTime);
        }
        if(mode == 'start') {
            time = moment(time).second(0);
        }

        let roundingMode = this._globalService.rounding_mode;
        let roundingTimes = this._globalService.rounding_times;

        let remainder;
        // Rounding Off
        if(roundingMode == 1) {
            remainder = roundingTimes - (time.minute() % roundingTimes);

            if(mode == 'start' && remainder == roundingTimes) {
                remainder = 0;
            }
            time = moment(time).add(remainder, 'minutes');
        }
        // Rounding Down
        else if(roundingMode == 2) {
            remainder = time.minute() % roundingTimes;
            time = moment(time).subtract(remainder, 'minutes');

        } else if(roundingMode == 3) {
            if((time.minute() % roundingTimes) == 0){

            } else {
                let halfRoundingTimes = Math.ceil(roundingTimes / 2);      // 8
                // example 1
                //      minute: 9
                //      startRemainder: 0
                //      finishRemainder: 15
                //
                //      startPeriodMinutes: 9 - 8 = 1
                //      finishPeriodMinutes: 9 + 8 = 17
                //
                //      1 <= 0 false
                //      17 >= 15 true
                //      final minute = 15

                let startTime = time.clone();
                let finishTime = time.clone();

                let startRemainder = time.minute() % roundingTimes;
                startTime = moment(startTime).subtract(startRemainder, 'minutes');
                let finishRemainder = roundingTimes - (time.minute() % roundingTimes);
                finishTime = moment(finishTime).add(finishRemainder, 'minutes');

                let startPeriodMinutes = time.minute() - halfRoundingTimes;
                let finishPeriodMinutes = time.minute() + halfRoundingTimes;

                // console.log(" --- halfRoundingTimes => ", halfRoundingTimes);
                // console.log(" --- startTime => ", startTime.minute());
                // console.log(" --- finishTime => ", finishTime.minute());
                // console.log(" --- startPeriodMinutes => ", startPeriodMinutes);
                // console.log(" --- finishPeriodMinutes => ", finishPeriodMinutes);

                if(startPeriodMinutes == startTime.minute() && finishPeriodMinutes <= finishTime.minute()) {
                    // use rounding off
                    time = finishTime;
                } else if(startPeriodMinutes <= startTime.minute()) {
                    // use rounding down
                    time = startTime;
                } else if(finishPeriodMinutes >= finishTime.minute()) {
                    // use rounding off
                    time = finishTime;
                }
            }
        }

        time = moment(time).second(0);

        return time;
    }

}
