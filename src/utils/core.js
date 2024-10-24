
import axios from 'axios';

export const regBldInfo = async (bldDefaultInfo, rentList) => {
    console.log(bldDefaultInfo, rentList)
    // let _bldDefaultInfo = JSON.stringify(bldDefaultInfo)
    // let _rentList = JSON.stringify(rentList)
    
    try {
        const res = await axios.post('http://localhost:3000/api/regbldinfo', {
            bldDefaultInfo,
            rentList
        });

        if (res.status === 200) {

        }
    } catch (error) {

    }
};

export const editBldInfo = async (bldDefaultInfo, rentList) => {
    console.log(bldDefaultInfo, rentList)
    // let _bldDefaultInfo = JSON.stringify(bldDefaultInfo)
    // let _rentList = JSON.stringify(rentList)
    
    try {
        const res = await axios.post('http://localhost:3000/api/regbldinfo', {
            bldDefaultInfo,
            rentList
        });

        if (res.status === 200) {

        }
    } catch (error) {

    }
};

export const getBldInfo = async() => {
    try {
        const res = await axios.get('http://localhost:3000/api/getbldinfo');

        if (res.status === 200) {
            return res
        }
    } catch (error) {

    }
};

