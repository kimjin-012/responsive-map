import { useRef, useEffect, useState } from 'react'
import {Link} from '@reach/router'
import * as tt from '@tomtom-international/web-sdk-maps'
import * as ttapi from '@tomtom-international/web-sdk-services'
import Geocode from "react-geocode";
import './App.css'
import '@tomtom-international/web-sdk-maps/dist/maps.css'

import Logo from './image/direction.png'

Geocode.setApiKey("AIzaSyD2O8UIsUWU-tbBKE5W5W9CSRxamWLDTnk");
Geocode.setLanguage("en");

const App = () => {
  const mapElement = useRef()
  const [map, setMap] = useState({})
  const [longitude, setLongitude] = useState(-122.335167)
  const [latitude, setLatitude] = useState(47.608013)
  const [address, setAddress] = useState({
    address: ""
  })
  // Adding markers on click
  const deliveryMarker = (lngLat, map) => {
    const element = document.createElement('div')
    element.className = 'marker-delivery'
    new tt.Marker({
      element: element
    })
    .setLngLat(lngLat)
    .addTo(map)
  }
  
  // routes in correct format
  const routes = (jsonData, map) => {
    if (map.getLayer('route')) {
      map.removeLayer('route')
      map.removeSource('route')
    }
    map.addLayer({
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: jsonData
      },
      paint: {
        'line-color': 'red',
        'line-width': 6
      }
    })
  }
  
  // converting to correct format for use
  const convertToPoints = (locationInput) => {
    return {
      point: {
        latitude: locationInput.lat,
        longitude: locationInput.lng
      }
    }
  }
  
  const changeHandler = e => {
    setAddress({
        ...address,
        [e.target.name]: e.target.value
    })
}

  const submitHandler = e => {
    e.preventDefault();
    Geocode.fromAddress(address.address)
    .then(response => {
        console.log(response.results)
        // setLocation(response.results[0].geometry.location)
        setLongitude(response.results[0].geometry.location.lng)
        setLatitude(response.results[0].geometry.location.lat)
        setAddress({
          address:""
        });
    })
    .catch(err => console.log(err));
  }

  const refreshPage = () => { 
    window.location.reload(); 
  }

  useEffect(() => {
    const origin = {
      lng: longitude,
      lat: latitude,
    }
    const destinations = []

    let map = tt.map({
      key: process.env.REACT_APP_API_KEY,
      container: mapElement.current,
      center: [longitude, latitude],
      zoom: 15,
      stylesVisibility: {
        trafficIncidents: true,
        trafficFlow: true,
      },
    })
    setMap(map)

    const Marker = () => {
      const popupOffset = {
        bottom: [0, -25]
      }
      const popup = new tt.Popup({ offset: popupOffset }).setHTML('This is you!')
      const element = document.createElement('div')
      element.className = 'marker'

      const marker = new tt.Marker({
        draggable: true,
        element: element,
      }).setLngLat([longitude, latitude]).addTo(map)
      
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        setLongitude(lngLat.lng)
        setLatitude(lngLat.lat)
      })

      marker.setPopup(popup).togglePopup()
      
    }
    Marker()

    const destinationSort = (locations) => {
      const pointsForDestinations = locations.map((destination) => {
        return convertToPoints(destination)
      })
      const callParameters = {
        key: process.env.REACT_APP_API_KEY,
        destinations: pointsForDestinations,
        origins: [convertToPoints(origin)],
      }

    return new Promise((resolve, reject) => {
      ttapi.services
        .matrixRouting(callParameters)
        .then(m => {
          const results = m.matrix[0]
          const resultsArray = results.map((result, i) => {
            return {
              location: locations[i],
              drivingtime: result.response.routeSummary.travelTimeInSeconds,
            }
          })
          resultsArray.sort((a, b) => {
            return a.drivingtime - b.drivingtime
          })
          const sortedLocations = resultsArray.map((result) => {
            return result.location
          })
          resolve(sortedLocations)
        })
      })
    }

    const routeCalculation = () => {
      destinationSort(destinations).then((sorted) => {
        sorted.unshift(origin)

        ttapi.services
          .calculateRoute({
            key: process.env.REACT_APP_API_KEY,
            locations: sorted,
          })
          .then((routeData) => {
            const geoJson = routeData.toGeoJson()
            routes(geoJson, map)
        })
      })
    }

    map.on('click', e => {
      destinations.push(e.lngLat)
      deliveryMarker(e.lngLat, map)
      routeCalculation()
    })
    map.addControl(new tt.NavigationControl(), 'top-left');

    return () => map.remove()
  }, [longitude, latitude])

  return (
    <>
        <div className="App">
          <img src={Logo} alt="Logo" />
          <div className="search-bar">
            <h1>Your Location??</h1>
            {/* <label htmlFor="longtitude">Longitude: </label>
            <input type="text" id="longitude" className="longitude" onChange={e => {setLongitude(e.target.value)}}/>
            <label htmlFor="latitude">Latitude:</label>
            <input type="text" id="latitude" className="latitude" onChange={e => {setLatitude(e.target.value)}}/> */}
            <form className="form-group" onSubmit={submitHandler}>
              <label htmlFor="address">Address:</label>
              <input className="form-control" type="text" name="address" onChange={changeHandler}/>
              <small id="addressHelp" className="form-text text-muted">Please enter the location/address name</small>
              <br/>
              <button class="btn btn-success" type="submit">Submit</button>
              <button onClick={ refreshPage } class="btn btn-warning">Reset</button>
            </form>
          </div>
          <div ref={mapElement} className="map" />
        </div>
    </>
  )
}

export default App;
