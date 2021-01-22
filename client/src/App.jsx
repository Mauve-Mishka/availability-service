
import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import Calendar from './Calendar.jsx';
import ReservationSummary from './ReservationSummary.jsx';
import $ from 'jquery';


class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      dates: [],
      checkIn: 'notSelected',
      checkOut: 'notSelected',
      maxSelectableDate: 'notSelected', //the last available date after the selected check-in date
      showing: false, //is calendar showing
      currentlySelecting: 'checkIn', //is the next date clicked to be check-in or check-out?
      activeSelecting: false,
      checkoutOnlyShowing: false,
      selectedCheckoutOnlyDate: 'none',
      hoveredDate: 'none',
      showCheckAvailabilityButton: true,
      showReserveButton: false,
      priceOfStay: 0,
      numNights: 0,
      minNightlyRate: 'none'
    };

    this.monthsMap = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];


    this.daysMap = [
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat'
    ];
  }

  removeCheckOutFromUrl() {
    var searchParams = {};
    var searches = window.location.search.split(/[=?]/);
    return `?${searches[1]}=${searches[2]}`
  }

  componentDidMount() {
    var productId = window.location.pathname.split('/')[1];
    if (productId === null || productId === undefined || productId.length === 0){
      productId = '109';
    }
    var searchParams = {};
    var searches = window.location.search.split(/[=?]/);
    for (var i = 1; i < searches.length; i = i + 2) {
      searchParams[searches[i]] = searches[i + 1];
    }
    console.log(searchParams);
    var stateObj = {};
    var hash = window.location.hash;
    if(hash === '#availability-calendar') {
      stateObj['activeSelecting'] =  true
      stateObj['showing'] = true;
      stateObj['showCheckAvailabilityButton'] = false;
    } else {
      stateObj.activeSelecting = false;
      stateObj.showing = false;
      stateObj['showCheckAvailabilityButton'] = true;
    }
    if(searchParams['check_in'] !== undefined) {
      //we have a check-in date
      var cidStr = searchParams['check_in'];
      var cidArr = cidStr.split('-');
      var cid = new Date();
      cid.setFullYear(cidArr[0]);
      cid.setMonth(cidArr[1] - 1);
      cid.setDate(cidArr[2]);
      cid.setHours(0, 0, 0);
      stateObj.checkIn = cid;
      stateObj.currentlySelecting = 'checkOut';
    } else {
      stateObj.checkIn = 'notSelected'
    }
    if(searchParams['check_out'] !== undefined) {
      //we have a check-out date
      var codStr = searchParams['check_out'];
      var codArr = codStr.split('-');
      var cod = new Date();
      cod.setFullYear(codArr[0]);
      cod.setMonth(codArr[1] - 1);
      cod.setDate(codArr[2]);
      cod.setHours(0, 0, 0);
      stateObj.checkOut = cod;

      //SHOW RESERVE BUTTON AND RES SUMMARY
    } else {
      stateObj.currentlySelecting = 'checkOut';
      stateObj.checkOut =  'notSelected';
    }
    $.ajax({
      method: 'GET',
      url: `/${productId}/availableDates`,
      success: (dates) => {

        if(stateObj.currentlySelecting === 'checkOut') {
          //if a check-in date, but not check-out date, is selected, we have to find the max selectable date too
          var checkInDate = new Date(stateObj.checkIn);
          checkInDate.setHours(0, 0, 0);
          var hitCheckInDate = false;
          for (var i = 0; i < dates.length; i++) {
            var curDate = new Date(dates[i].date);
            curDate.setHours(0, 0, 0);
            if (!hitCheckInDate) {
              if (curDate.toString() === checkInDate.toString()) {
                hitCheckInDate = true;
              }
            } else {
              if (dates[i].isAvailable === false) {
                console.log('hit max selectable date', dates[i].date);
                stateObj['maxSelectableDate'] =  new Date(dates[i].date);
                break;
              }
            }
          }

        }

        stateObj.dates = dates;


        $.ajax({
          method: 'GET',
          url: `/${productId}/minNightlyRate`,
          success: ({minNightlyRate}) => {
            stateObj.minNightlyRate = minNightlyRate;
            this.setState(stateObj)
          }

        })

      },
      error: (err) => {
        console.log('GOT AN ERROR', err);
        this.setState(stateObj);
      }

    });
  }

  onSelect(dates) {
    this.setState({ dates });
  }

  onClickCheckinShowCalendar() {
    this.setState({
      showing: true,
      currentlySelecting: 'checkIn',
      activeSelecting: true,
      showReserveButton: false
    });
    window.location.hash = '#availability-calendar';
  }
  onClickCheckoutShowCalendar() {
    this.setState({
      showing: true,
      currentlySelecting: 'checkOut',
      activeSelecting: true
    });
    window.location.hash = '#availability-calendar';

  }

  dateClicked(e, dateIsCheckoutOnly) {
    if (this.state.currentlySelecting === 'checkIn' && dateIsCheckoutOnly === false) {
      //go through dates and find the maxSelectableDate
      var checkInDate = new Date(e);
      checkInDate.setHours(0, 0, 0);
      var hitCheckInDate = false;
      for (var i = 0; i < this.state.dates.length; i++) {
        var curDate = new Date(this.state.dates[i].date);
        curDate.setHours(0, 0, 0);
        if (!hitCheckInDate) {
          if (curDate.toString() === checkInDate.toString()) {
            hitCheckInDate = true;
          }
        } else {
          if (this.state.dates[i].isAvailable === false) {
            this.setState({
              checkIn: checkInDate.toString(),
              currentlySelecting: 'checkOut',
              maxSelectableDate: this.state.dates[i].date
            });
            window.location.search = `?check_in=${checkInDate.getFullYear()}-${checkInDate.getMonth()+1}-${checkInDate.getDate()}`;
            return;
          }
        }
      }
    } else if (this.state.currentlySelecting === 'checkOut') {
      //if we selected check-out date, set check-out date and close the calendar
      var checkOutDate = new Date(e);
      checkOutDate.setHours(0, 0, 0);
      this.setState({
        checkOut: checkOutDate.toString(),
        showing: false,
        activeSelecting: false,
        showCheckAvailabilityButton: false,
        showReserveButton: true
      });
      window.location.hash = '';
      this.getTotalPrice(checkOutDate.toString());

      window.location.search += `&check_out=${checkOutDate.getFullYear()}-${checkOutDate.getMonth()+1}-${checkOutDate.getDate()}`;
    } else if (dateIsCheckoutOnly) {
      var checkOutOnlyDate = new Date(e);
      checkOutOnlyDate.setHours(0, 0, 0);
      this.setState({
        checkoutOnlyShowing: true,
        selectedCheckoutOnlyDate: checkOutOnlyDate.toString()
      });
    }

  }

  clearDates() {

    this.setState({
      activeSelecting: true,
      currentlySelecting: 'checkIn',
      checkIn: 'notSelected',
      checkOut: 'notSelected',
      selectedCheckoutOnlyDate: 'none',
      hoveredDate: 'none',
      checkoutOnlyShowing: false,
      howCheckAvailabilityButton: true,
      showReserveButton: false,
      maxSelectableDate: 'notSelected'
    });
    window.location.search='';
  }

  closeCalendar() {
    this.setState({
      activeSelecting: false,
      currentlySelecting: 'checkIn',
      showing: false
    });
    window.location.hash='';
  }

  changeHoveredDate(date) {
    var hDate = new Date(date);
    hDate.setHours(0, 0, 0);
    this.setState({
      hoveredDate: hDate.toString()
    });
  }

  getTotalPrice(checkOut) {
    var checkOutDate = new Date(checkOut);
    var checkInDate = new Date(this.state.checkIn);
    var numNights = Math.floor((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    console.log(checkOutDate, checkInDate);
    this.setState({
      numNights: numNights
    });
    for (var i = 0; i < this.state.dates.length; i++) {
      var thisNight = this.state.dates[i];
      var thisNightDate = new Date(this.state.dates[i].date);
      if (thisNightDate.toString().slice(0, 15) === checkInDate.toString().slice(0, 15)) {

        this.setState({
          priceOfStay: this.state.dates[i].nightlyRate * numNights,
          cleaningFee: thisNight.cleaningFee * numNights,
          serviceFee: thisNight.serviceFee * numNights
        });
        return;
      }
    }
  }

  getCheckIn() {
    return new Date(this.state.checkIn);
  }

  getCheckOut() {
    return new Date(this.state.checkOut);
  }

  render() {
    var checkInStyle = {
      fontWeight: 'normal'
    };
    var checkOutStyle = {
      fontWeight: 'normal'
    };
    if (this.state.activeSelecting === true && this.state.currentlySelecting === 'checkIn') {
      var checkInStyle = {
        fontWeight: 'bold'
      };
    }
    if (this.state.activeSelecting === true && this.state.currentlySelecting === 'checkOut') {
      var checkOutStyle = {
        fontWeight: 'bold'
      };
    }
    return (
      <div>
        <div id = 'minNightlyRate' style={{display: this.state.minNightlyRate === 'none' ? 'none' : 'block' }}>
          { ` $${(this.state.checkOut === 'notSelected') ? this.state.minNightlyRate : Math.floor(this.state.priceOfStay / this.state.numNights)} per night`}
        </div>
        <br/>
        <div id = 'check-in'>
          <div id = "check-in1" style = {checkInStyle}>
            Check-in:
          </div>
        </div>
        <div id = 'check-in-add-date' data-testId ='checkInDate' onClick = {this.onClickCheckinShowCalendar.bind(this)}>
          {this.state.checkIn === 'notSelected' ? 'Add date' : `${this.daysMap[this.getCheckIn().getDay()]} ${this.monthsMap[this.getCheckIn().getMonth()]} ${this.getCheckIn().getDate()} ${this.getCheckIn().getFullYear()}` }
        </div>

        <div id = 'check-out'>
          <div id = "check-out1" style = {checkOutStyle}>
            Check-out:
          </div>
          <div id = 'check-out-add-date' data-testId ='checkOutDate' onClick = {this.onClickCheckoutShowCalendar.bind(this)}>
            {this.state.checkOut === 'notSelected' ? 'Add date' : `${this.daysMap[this.getCheckOut().getDay()]} ${this.monthsMap[this.getCheckOut().getMonth()]} ${this.getCheckOut().getDate()} ${this.getCheckOut().getFullYear()}`}
          </div>
        </div>

        <div id = 'calendar'>
          <div id = 'calendar-table' data-testId = 'calendar' style={{display: this.state.showing ? 'block' : 'none' }}>
            <Calendar maxSelectableDate = {this.state.maxSelectableDate} hoveredDate = {this.state.hoveredDate} changeHoveredDate = {this.changeHoveredDate.bind(this)} selectedCheckoutOnlyDate = {this.state.selectedCheckoutOnlyDate} dates = {this.state.dates} checkInDate = {this.state.checkIn} checkOutDate = {this.state.checkOut} clearDates = {this.clearDates.bind(this)} closeCalendar = {this.closeCalendar.bind(this)} dateClicked = {this.dateClicked.bind(this)}/>
          </div>


        </div>
        <div id = 'dateIsCheckoutOnly' style={{display: (this.state.checkoutOnlyShowing && (this.state.hoveredDate.toString().slice(0, 17) === this.state.selectedCheckoutOnlyDate.toString().slice(0, 17))) ? 'block' : 'none'}}> This date is check-out only. </div>
        <br/>
        <button onClick={this.onClickCheckinShowCalendar.bind(this)} style={{display: (this.state.showCheckAvailabilityButton) ? 'block' : 'none'}}> Check Availability </button>
        <div style={{display: (this.state.showReserveButton) ? 'block' : 'none'}}>
          <br/>
          <br/>
          <ReservationSummary cleaningFee = {this.state.cleaningFee} serviceFee = {this.state.serviceFee} numNights = {this.state.numNights} priceOfStay = {this.state.priceOfStay}/>
          <button >Reserve</button>
        </div>
      </div>


    );
  }
}

export default App;